import { describe, expect, it } from "vitest";
import { withParamDefaults } from "./constants.js";
import { computePriceAfterMonthTransition } from "./monthlyPriceStep.js";

describe("computePriceAfterMonthTransition", () => {
  it("moves price only from structural term when halving and vol are off", () => {
    const parameters = withParamDefaults({
      halvingNarrativeAmp: 0,
      initialAnnualVolatility: 0,
      volatilityReduction: 0,
      maxMonthlyPctGain: 20,
      baseElasticity: 1.1,
      miningCostFloor: 1,
    });
    const initialLiquid = 100_000;
    const liquid = 100_000;
    const netDemand = 0;
    const nextPrice = computePriceAfterMonthTransition({
      price: 50_000,
      liquid,
      initLiq: initialLiquid,
      netDemand,
      unmetDemandPremiumMonthly: 0,
      year: 2025,
      monthIndex: 0,
      totalMonths: 12,
      parameters,
    });
    expect(nextPrice).toBe(50_000);
  });

  it("floors price at miningCostFloor", () => {
    const parameters = withParamDefaults({
      halvingNarrativeAmp: 0,
      initialAnnualVolatility: 0,
      volatilityReduction: 0,
      maxMonthlyPctGain: 20,
      baseElasticity: 1.1,
      miningCostFloor: 40_000,
    });
    const nextPrice = computePriceAfterMonthTransition({
      price: 50_000,
      liquid: 100_000,
      initLiq: 100_000,
      netDemand: -1e6,
      unmetDemandPremiumMonthly: 0,
      year: 2025,
      monthIndex: 0,
      totalMonths: 12,
      parameters,
    });
    expect(nextPrice).toBe(40_000);
  });
});
