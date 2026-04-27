import { describe, expect, it } from "vitest";
import { withParamDefaults } from "./constants.js";
import { computeMonthlyDemandFromUsd } from "./monthlyDemandFromUsd.js";

function demandParameters(overrides = {}) {
  return withParamDefaults({
    minerSellPct: 0,
    annualLossRate: 0,
    capBuyingToLiquidFloat: true,
    unmetDemandPriceStrength: 0.6,
    unmetPremiumMaxMonthlyPct: 8,
    etfFlowVolatilityPct: 0,
    etfOutflowShockPct: 0,
    etfStressRedemptionCount: 1,
    institutionalAllocationCapPct: 100,
    priceSensitiveDemandElasticity: 0,
    momentumDemandBoost: 0,
    momentumDecayMonths: 6,
    maxMomentumBoostPct: 75,
    ...overrides,
  });
}

describe("computeMonthlyDemandFromUsd", () => {
  it("uses buyScale 1 when float cap is off", () => {
    const parameters = demandParameters({ capBuyingToLiquidFloat: false });
    const demand = computeMonthlyDemandFromUsd({
      price: 50_000,
      liquid: 100_000,
      strcUSD: 1e12,
      otherUSD: 0,
      etfUSD: 0,
      retailNetUsd: 0,
      dailyMining: 100,
      parameters,
    });
    expect(demand.buyScale).toBe(1);
    expect(demand.unmetDemandPremiumMonthly).toBe(0);
  });

  it("reduces buyScale below 1 when cap is on and gross hoarding exceeds room", () => {
    const parameters = demandParameters({ capBuyingToLiquidFloat: true });
    const demand = computeMonthlyDemandFromUsd({
      price: 50_000,
      liquid: 60_000,
      strcUSD: 1e12,
      otherUSD: 0,
      etfUSD: 0,
      retailNetUsd: 0,
      dailyMining: 0,
      parameters,
    });
    expect(demand.buyScale).toBeLessThan(1);
    expect(demand.unmetBuyBtcMonthly).toBeGreaterThan(0);
  });

  it("does not apply unmet premium when cap is off", () => {
    const parameters = demandParameters({ capBuyingToLiquidFloat: false });
    const demand = computeMonthlyDemandFromUsd({
      price: 50_000,
      liquid: 60_000,
      strcUSD: 1e12,
      otherUSD: 0,
      etfUSD: 0,
      retailNetUsd: 0,
      dailyMining: 0,
      parameters,
    });
    expect(demand.unmetDemandPremiumMonthly).toBe(0);
  });

  it("throttles institutional buying when the allocation cap is reached", () => {
    const parameters = demandParameters({ institutionalAllocationCapPct: 10, circulatingSupply: 1_000_000 });
    const demand = computeMonthlyDemandFromUsd({
      price: 50_000,
      liquid: 500_000,
      strcUSD: 1e9,
      otherUSD: 1e9,
      etfUSD: 1e9,
      retailNetUsd: 0,
      dailyMining: 0,
      treasury: 100_000,
      etfBtc: 0,
      parameters,
    });
    expect(demand.institutionalScale).toBe(0);
    expect(demand.strcBtc + demand.otherBtc + demand.etfBtc2).toBe(0);
  });

  it("reduces positive USD demand as price rises when price sensitivity is on", () => {
    const parameters = demandParameters({ priceSensitiveDemandElasticity: 1, startPrice: 50_000 });
    const demand = computeMonthlyDemandFromUsd({
      price: 100_000,
      liquid: 500_000,
      strcUSD: 1e9,
      otherUSD: 0,
      etfUSD: 0,
      retailNetUsd: 0,
      dailyMining: 0,
      parameters,
    });
    expect(demand.priceDemandScale).toBe(0.5);
    expect(demand.strcBtc).toBe(5_000);
  });

  it("uses 52w MA for valuation drag when priceMa52w is passed", () => {
    const parameters = demandParameters({ priceSensitiveDemandElasticity: 1, startPrice: 10_000 });
    const demand = computeMonthlyDemandFromUsd({
      price: 100_000,
      priceMa52w: 40_000,
      liquid: 500_000,
      strcUSD: 1e9,
      otherUSD: 0,
      etfUSD: 0,
      retailNetUsd: 0,
      dailyMining: 0,
      parameters,
    });
    expect(demand.priceDemandScale).toBe(0.4);
  });

  it("boosts positive USD demand from recent price momentum", () => {
    const parameters = demandParameters({
      momentumDemandBoost: 2,
      maxMomentumBoostPct: 50,
    });
    const demand = computeMonthlyDemandFromUsd({
      price: 50_000,
      liquid: 500_000,
      strcUSD: 1e9,
      otherUSD: 0,
      etfUSD: 0,
      retailNetUsd: 0,
      dailyMining: 0,
      momentumReturn: 0.1,
      parameters,
    });
    expect(demand.momentumDemandScale).toBeCloseTo(1.2);
    expect(demand.strcBtc).toBeCloseTo(24_000);
  });

  it("caps the momentum demand boost", () => {
    const parameters = demandParameters({
      momentumDemandBoost: 10,
      maxMomentumBoostPct: 25,
    });
    const demand = computeMonthlyDemandFromUsd({
      price: 50_000,
      liquid: 500_000,
      strcUSD: 1e9,
      otherUSD: 0,
      etfUSD: 0,
      retailNetUsd: 0,
      dailyMining: 0,
      momentumReturn: 0.5,
      parameters,
    });
    expect(demand.momentumDemandScale).toBe(1.25);
  });

  it("applies the ETF stress outflow as sell pressure in the shock month", () => {
    const parameters = demandParameters({ etfOutflowShockPct: 10, etfStressRedemptionCount: 1 });
    const demand = computeMonthlyDemandFromUsd({
      price: 50_000,
      liquid: 500_000,
      strcUSD: 0,
      otherUSD: 0,
      etfUSD: 0,
      retailNetUsd: 0,
      dailyMining: 0,
      monthIndex: 6,
      totalMonths: 12,
      etfBtc: 100_000,
      parameters,
    });
    expect(demand.etfBtc2).toBe(-10_000);
    expect(demand.totalSellDay).toBeCloseTo(10_000 / 30, 6);
  });

  it("does not apply ETF stress outflows when stress redemption count is zero", () => {
    const parameters = demandParameters({ etfOutflowShockPct: 10, etfStressRedemptionCount: 0 });
    const demand = computeMonthlyDemandFromUsd({
      price: 50_000,
      liquid: 500_000,
      strcUSD: 0,
      otherUSD: 0,
      etfUSD: 0,
      retailNetUsd: 0,
      dailyMining: 0,
      monthIndex: 6,
      totalMonths: 12,
      etfBtc: 100_000,
      parameters,
    });
    expect(demand.etfBtc2).toBe(0);
    expect(demand.totalSellDay).toBe(0);
  });

  it("distributes multiple ETF stress outflows through the simulation", () => {
    const parameters = demandParameters({ etfOutflowShockPct: 10, etfStressRedemptionCount: 3 });
    const baseInput = {
      price: 50_000,
      liquid: 500_000,
      strcUSD: 0,
      otherUSD: 0,
      etfUSD: 0,
      retailNetUsd: 0,
      dailyMining: 0,
      totalMonths: 12,
      etfBtc: 100_000,
      parameters,
    };
    const shockMonths = [3, 6, 9].filter((monthIndex) => {
      const demand = computeMonthlyDemandFromUsd({ ...baseInput, monthIndex });
      return demand.etfBtc2 < 0;
    });
    const nonShock = computeMonthlyDemandFromUsd({ ...baseInput, monthIndex: 4 });
    expect(shockMonths).toEqual([3, 6, 9]);
    expect(nonShock.etfBtc2).toBe(0);
  });
});
