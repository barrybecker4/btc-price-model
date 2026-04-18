import { describe, expect, it } from "vitest";
import { MONTHS_PER_YEAR, withParamDefaults } from "./constants.js";
import { applyHolderFlows, initialHolderSplit, LIQ_FLOOR, rebalanceLiquidToFloor } from "./holderBuckets.js";

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

  it("clamps LTH share to 60–80% and ancient to 15–20%", () => {
    const available = 1_000_000;
    const split = initialHolderSplit(available, 50, 50);
    const expectedLth = available * 0.6;
    const expectedAncient = Math.min(available * 0.2, expectedLth);
    expect(split.lth155Total).toBeCloseTo(expectedLth, 6);
    expect(split.ancientBtc).toBeCloseTo(expectedAncient, 6);
  });

  it("pulls from LTH toward LIQ_MIN_INIT when liquid would be too low", () => {
    const available = 600_000;
    const split = initialHolderSplit(available, 80, 20);
    expect(split.liquid).toBeGreaterThanOrEqual(200_000);
  });
});

describe("applyHolderFlows", () => {
  it("scales positive outflows when they would breach the liquid floor", () => {
    const parameters = withParamDefaults({
      flowLiquidToLth155Annual: 200,
      flowLiquidToAncientAnnual: 200,
    });
    const liquid = 55_000;
    const young = 0;
    const ancient = 0;
    const out = applyHolderFlows(liquid, young, ancient, parameters);
    expect(out.liquid).toBeGreaterThanOrEqual(LIQ_FLOOR);
    const rawMonthly =
      (200 / 100) * (liquid / MONTHS_PER_YEAR) + (200 / 100) * (liquid / MONTHS_PER_YEAR);
    expect(rawMonthly).toBeGreaterThan(liquid - LIQ_FLOOR);
  });

  it("moves young LTH to liquid when annual rate is negative", () => {
    const parameters = withParamDefaults({
      flowLiquidToLth155Annual: -12,
      flowLiquidToAncientAnnual: 0,
    });
    const out = applyHolderFlows(100_000, 50_000, 0, parameters);
    expect(out.liquid).toBeGreaterThan(100_000);
    expect(out.youngLth).toBeLessThan(50_000);
  });

  it("moves ancient to liquid when ancient annual rate is negative", () => {
    const parameters = withParamDefaults({
      flowLiquidToLth155Annual: 0,
      flowLiquidToAncientAnnual: -24,
    });
    const out = applyHolderFlows(100_000, 0, 40_000, parameters);
    expect(out.liquid).toBeGreaterThan(100_000);
    expect(out.ancientBtc).toBeLessThan(40_000);
  });
});
