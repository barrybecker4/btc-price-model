import { describe, expect, it } from "vitest";
import { DEFAULT_ORGANIC_BUY_GROWTH_TAPER_YEARS, DEFAULTS, withParamDefaults } from "../config/constants.js";
import { nominalGdpGrowthPct } from "../macro/nominalGdp.js";
import { effectiveAnnualGrowthTapered } from "./growthTaper.js";
import { advanceUsdFlowsForMonth } from "./usdFlowGrowth.js";

describe("advanceUsdFlowsForMonth", () => {
  it("grows USD flows by tapered monthly factors", () => {
    const parameters = withParamDefaults({
      strcGrowthRate: 12,
      otherTreasuryGrowth: 10,
      etfGrowthRate: 10,
      organicBuyGrowth: 8,
      realGdpGrowth: 1,
      inflation: 3,
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

  it("after taper horizon all channels share the same terminal growth (nominal GDP)", () => {
    const parameters = withParamDefaults({
      realGdpGrowth: 1,
      inflation: 3,
      strcGrowthRate: 20,
      otherTreasuryGrowth: 20,
      etfGrowthRate: 20,
      organicBuyGrowth: 20,
      strcGrowthTaperYears: 8,
      otherTreasuryGrowthTaperYears: 8,
      etfGrowthTaperYears: 8,
      organicBuyGrowthTaperYears: 8,
    });
    const rInf = nominalGdpGrowthPct(parameters.realGdpGrowth, parameters.inflation);
    const tYears = 30;
    const strcRate = effectiveAnnualGrowthTapered({
      r0: parameters.strcGrowthRate,
      rInf,
      tYears,
      nYears: parameters.strcGrowthTaperYears,
    });
    const etfRate = effectiveAnnualGrowthTapered({
      r0: parameters.etfGrowthRate,
      rInf,
      tYears,
      nYears: parameters.etfGrowthTaperYears,
    });
    const organicRate = effectiveAnnualGrowthTapered({
      r0: parameters.organicBuyGrowth,
      rInf,
      tYears,
      nYears: parameters.organicBuyGrowthTaperYears,
    });
    expect(strcRate).toBeCloseTo(4, 1);
    expect(etfRate).toBeCloseTo(4, 1);
    expect(organicRate).toBeCloseTo(4, 1);
    expect(etfRate).toBe(strcRate);
    expect(organicRate).toBe(strcRate);
  });
});
