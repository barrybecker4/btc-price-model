import { describe, expect, it } from "vitest";
import { DEFAULT_ORGANIC_BUY_GROWTH_TAPER_YEARS, DEFAULTS, withParamDefaults } from "./constants.js";
import { effectiveAnnualGrowthTapered } from "./growthTaper.js";
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

  it("after taper horizon retail/ETF exceed treasury terminal growth when AI uplift is set", () => {
    const parameters = withParamDefaults({
      gdpGrowth: 4,
      aiProductivityPct: 2,
      strcGrowthRate: 20,
      otherTreasuryGrowth: 20,
      etfGrowthRate: 20,
      organicBuyGrowth: 20,
      strcGrowthTaperYears: 8,
      otherTreasuryGrowthTaperYears: 8,
      etfGrowthTaperYears: 8,
      organicBuyGrowthTaperYears: 8,
    });
    const tYears = 30;
    const strcRate = effectiveAnnualGrowthTapered({
      r0: parameters.strcGrowthRate,
      rInf: parameters.gdpGrowth,
      tYears,
      nYears: parameters.strcGrowthTaperYears,
    });
    const etfRate = effectiveAnnualGrowthTapered({
      r0: parameters.etfGrowthRate,
      rInf: parameters.gdpGrowth + parameters.aiProductivityPct * 0.5,
      tYears,
      nYears: parameters.etfGrowthTaperYears,
    });
    const organicRate = effectiveAnnualGrowthTapered({
      r0: parameters.organicBuyGrowth,
      rInf: parameters.gdpGrowth + parameters.aiProductivityPct,
      tYears,
      nYears: parameters.organicBuyGrowthTaperYears,
    });
    expect(strcRate).toBeCloseTo(4, 1);
    expect(etfRate).toBeCloseTo(5, 1);
    expect(organicRate).toBeCloseTo(6, 1);
    expect(organicRate).toBeGreaterThan(strcRate);
    expect(etfRate).toBeGreaterThan(strcRate);
  });

  it("grows retail faster than treasury over many months with AI uplift", () => {
    const parameters = withParamDefaults({
      gdpGrowth: 4,
      aiProductivityPct: 3,
      strcGrowthRate: 15,
      organicBuyGrowth: 15,
      strcGrowthTaperYears: 4,
      organicBuyGrowthTaperYears: 4,
    });
    let strcUSD = 1e9;
    let retailNetUsd = 1e8;
    for (let monthIndex = 0; monthIndex < DEFAULT_ORGANIC_BUY_GROWTH_TAPER_YEARS * 12 + 24; monthIndex++) {
      const next = advanceUsdFlowsForMonth({
        strcUSD,
        otherUSD: 1e9,
        etfUSD: 1e9,
        retailNetUsd,
        monthIndex,
        parameters,
      });
      strcUSD = next.strcUSD;
      retailNetUsd = next.retailNetUsd;
    }
    const retailGrowthFactor = retailNetUsd / 1e8;
    const strcGrowthFactor = strcUSD / 1e9;
    expect(retailGrowthFactor).toBeGreaterThan(strcGrowthFactor);
  });
});
