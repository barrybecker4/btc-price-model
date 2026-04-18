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
});
