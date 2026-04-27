import { describe, expect, it } from "vitest";
import { DEFAULTS, withParamDefaults } from "./constants.js";

describe("withParamDefaults", () => {
  it("fills undefined and NaN numeric fields from DEFAULTS", () => {
    const merged = withParamDefaults({ simYears: undefined, startPrice: NaN });
    expect(merged.simYears).toBe(DEFAULTS.simYears);
    expect(merged.startPrice).toBe(DEFAULTS.startPrice);
  });

  it("maps legacy tiny halvingNarrativeAmp to 0–1 scale", () => {
    const merged = withParamDefaults({ halvingNarrativeAmp: 0.01 });
    expect(merged.halvingNarrativeAmp).toBe(0.5);
  });

  it("strips removed organic/bond keys from older state", () => {
    const merged = withParamDefaults({
      bondYield: 4,
      organicDailyBuy: 1,
      organicDailySell: 1,
      organicSellDecline: 1,
    });
    expect(merged.bondYield).toBeUndefined();
    expect(merged.organicDailyBuy).toBeUndefined();
  });

  it("keeps explicit numeric zero and does not replace it with defaults", () => {
    const merged = withParamDefaults({ initialRetailPurchaseRateM: 0 });
    expect(merged.initialRetailPurchaseRateM).toBe(0);
  });

  it("clamps LTH profit distribution to 0–5%/yr", () => {
    expect(withParamDefaults({ lthProfitDistributionAnnualPct: 15 }).lthProfitDistributionAnnualPct).toBe(5);
    expect(withParamDefaults({ lthProfitDistributionAnnualPct: -3 }).lthProfitDistributionAnnualPct).toBe(0);
  });

  it("clamps ETF stress redemption size to ≤10% and bumps (0, 0.1) to 0.1%; leaves 0", () => {
    expect(withParamDefaults({ etfOutflowShockPct: 25 }).etfOutflowShockPct).toBe(10);
    expect(withParamDefaults({ etfOutflowShockPct: 0.05 }).etfOutflowShockPct).toBeCloseTo(0.1, 10);
    expect(withParamDefaults({ etfOutflowShockPct: 0 }).etfOutflowShockPct).toBe(0);
    expect(withParamDefaults({ etfOutflowShockPct: -2 }).etfOutflowShockPct).toBe(0);
  });
});
