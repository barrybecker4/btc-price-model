import { describe, expect, it } from "vitest";
import { MONTHS_PER_YEAR, withParamDefaults } from "./constants.js";
import {
  applyHolderFlows,
  initialHolderSplit,
  rebalanceLiquidToFloor,
  runSim,
} from "./runSim.js";

function baseParams(overrides = {}) {
  return withParamDefaults({
    simYears: 1,
    startPrice: 100_000,
    miningCostFloor: 1_000,
    circulatingSupply: 2_000_000,
    alreadyLostCoins: 0,
    strcInitialBtc: 0,
    otherInitialBtc: 0,
    etfInitialBtc: 0,
    strcInitialUsdB: 0,
    otherTreasuryUsdB: 0,
    etfDailyInflowM: 0,
    initialRetailPurchaseRateM: 0,
    annualLossRate: 0,
    minerSellPct: 0,
    initialAnnualVolatility: 0,
    halvingNarrativeAmp: 0,
    volatilityReduction: 0,
    flowLiquidToLth155Annual: 0,
    flowLiquidToAncientAnnual: 0,
    ...overrides,
  });
}

describe("rebalanceLiquidToFloor", () => {
  it("preserves liquid + young + ancient", () => {
    const liquid = 40_000;
    const young = 500_000;
    const ancient = 100_000;
    const floor = 50_000;
    const { liquid: L, youngLth: Y, ancientBtc: A } = rebalanceLiquidToFloor(
      liquid,
      young,
      ancient,
      floor
    );
    expect(L + Y + A).toBe(liquid + young + ancient);
    expect(L).toBe(floor);
    expect(Y).toBe(young - 10_000);
    expect(A).toBe(ancient);
  });

  it("does not invent coins when buckets cannot reach the floor", () => {
    const liquid = 10_000;
    const young = 5_000;
    const ancient = 2_000;
    const { liquid: L, youngLth: Y, ancientBtc: A } = rebalanceLiquidToFloor(
      liquid,
      young,
      ancient,
      50_000
    );
    expect(L + Y + A).toBe(liquid + young + ancient);
    expect(L).toBe(17_000);
  });
});

describe("initialHolderSplit", () => {
  it("keeps liquid + LTH total equal to available float", () => {
    const available = 1_000_000;
    const { liquid, youngLth, ancientBtc } = initialHolderSplit(available, 73, 17);
    expect(liquid + youngLth + ancientBtc).toBeCloseTo(available, 6);
  });
});

describe("applyHolderFlows", () => {
  it("scales positive outflows when they would breach the liquid floor", () => {
    const p = { flowLiquidToLth155Annual: 200, flowLiquidToAncientAnnual: 200 };
    const liquid = 55_000;
    const young = 0;
    const ancient = 0;
    const out = applyHolderFlows(liquid, young, ancient, p);
    expect(out.liquid).toBeGreaterThanOrEqual(50_000);
    const rawMonthly =
      (200 / 100) * (liquid / MONTHS_PER_YEAR) + (200 / 100) * (liquid / MONTHS_PER_YEAR);
    expect(rawMonthly).toBeGreaterThan(liquid - 50_000);
  });
});

describe("runSim", () => {
  it("emits months + 1 rows and leaves start price unchanged with no vol and no flows", () => {
    const p = baseParams({ simYears: 2 });
    const { data } = runSim(p);
    expect(data.length).toBe(p.simYears * MONTHS_PER_YEAR + 1);
    expect(data[0].price).toBe(p.startPrice);
  });

  it("records supply shock year when liquid share falls below 30%", () => {
    const p = baseParams({
      simYears: 15,
      circulatingSupply: 800_000,
      lth155SharePct: 85,
      annualLossRate: 80,
      minerSellPct: 0,
    });
    const { supplyShockYear, data } = runSim(p);
    const crossed = data.some((row) => row.liquidPct < 30);
    expect(crossed).toBe(true);
    expect(supplyShockYear).not.toBeNull();
  });

  it("applies buyScale below 1 when float cap binds", () => {
    const p = baseParams({
      simYears: 1,
      circulatingSupply: 1_000_000,
      strcInitialUsdB: 1000,
      capBuyingToLiquidFloat: true,
      minerSellPct: 0,
    });
    const { data } = runSim(p);
    const rationed = data.some((row) => row.buyRationPct > 0 && row.unmetBuyBtcM > 0);
    expect(rationed).toBe(true);
  });
});
