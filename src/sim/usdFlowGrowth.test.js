import { describe, expect, it } from "vitest";
import { DEFAULTS, withParamDefaults } from "./constants.js";
import { advanceUsdFlowsForMonth } from "./usdFlowGrowth.js";

describe("advanceUsdFlowsForMonth", () => {
  it("grows USD flows by tapered monthly factors", () => {
    const parameters = withParamDefaults({
      strcGrowthRate: 12,
      otherTreasuryGrowth: 10,
      etfGrowthRate: 10,
      organicBuyGrowth: 8,
      gdpGrowth: 4,
    });
    const next = advanceUsdFlowsForMonth({
      strcUSD: 1e9,
      otherUSD: 1e9,
      etfUSD: 1e9,
      retailNetUsd: 1e8,
      monthIndex: 0,
      parameters,
    });
    expect(next.strcUSD).toBeGreaterThan(1e9);
    expect(next.otherUSD).toBeGreaterThan(1e9);
    expect(next.etfUSD).toBeGreaterThan(1e9);
    expect(next.retailNetUsd).toBeGreaterThan(1e8);
  });

  it("uses DEFAULTS when taper years are omitted", () => {
    const parameters = { ...DEFAULTS };
    const next = advanceUsdFlowsForMonth({
      strcUSD: 100,
      otherUSD: 100,
      etfUSD: 100,
      retailNetUsd: 50,
      monthIndex: 6,
      parameters,
    });
    expect(Number.isFinite(next.strcUSD)).toBe(true);
    expect(Number.isFinite(next.retailNetUsd)).toBe(true);
  });
});
