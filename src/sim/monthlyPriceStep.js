import { getHalvingCycleMonthlyAdj } from "./halving.js";
import { LIQ_FLOOR } from "./holderBuckets.js";
import {
  monthlySigmaFromAnnual,
  seededClampedNormal,
  volatilityTimeDecayMultiplier,
} from "./volatility.js";

/**
 * @param {object} input
 * @param {number} input.price
 * @param {number} input.liquid
 * @param {number} input.initLiq
 * @param {number} input.netDemand
 * @param {number} input.unmetDemandPremiumMonthly
 * @param {number} input.year
 * @param {number} input.monthIndex
 * @param {number} input.totalMonths
 * @param {import("./simTypes.js").SimParams} input.parameters
 * @returns {number}
 */
export function computePriceAfterMonthTransition(input) {
  const parameters = input.parameters;
  const liquidRatio = Math.max(input.liquid / input.initLiq, 0.03);
  const elasticity = parameters.baseElasticity / liquidRatio;
  const liquidForDemand = Math.max(input.liquid, LIQ_FLOOR);
  const structuralRaw = (input.netDemand / liquidForDemand) * elasticity;
  const rawPercent = structuralRaw + input.unmetDemandPremiumMonthly;
  const halvingCycleAdjustment = getHalvingCycleMonthlyAdj(
    input.year,
    parameters.halvingNarrativeAmp,
    parameters.halvingImpactDecay
  );
  const monthlyGainCap = parameters.maxMonthlyPctGain / 100;
  const structuralFund = Math.max(-0.2, Math.min(rawPercent, monthlyGainCap));
  let percentChange = structuralFund + halvingCycleAdjustment;

  const annualFraction = (parameters.initialAnnualVolatility ?? 0) / 100;
  const sigmaMonth = monthlySigmaFromAnnual(annualFraction);
  const reductionFraction = (parameters.volatilityReduction ?? 0) / 100;
  const volatilityDecay = volatilityTimeDecayMultiplier(reductionFraction, input.monthIndex, input.totalMonths);
  const randomSeed = parameters.randomSeed ?? 0;
  const volatilityShock = seededClampedNormal(randomSeed, input.monthIndex, 2.5) * sigmaMonth * volatilityDecay;
  percentChange += volatilityShock;
  percentChange = Math.max(-0.6, Math.min(percentChange, monthlyGainCap));

  const nextPrice = Math.max(input.price * (1 + percentChange), parameters.miningCostFloor);
  if (!Number.isFinite(nextPrice)) {
    throw new Error("runSim: price became non-finite after monthly update");
  }
  return nextPrice;
}
