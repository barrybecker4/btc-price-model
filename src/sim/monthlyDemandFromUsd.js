import { MONTHS_PER_YEAR } from "./constants.js";
import { getEtfStressRedemptionMonths } from "./etfStressRedemptions.js";
import { LIQ_FLOOR } from "./holderBuckets.js";
import { monthlySigmaFromAnnual, seededClampedNormal } from "./volatility.js";

/**
 * @param {object} input
 * @param {number} input.price
 * @param {number} input.liquid
 * @param {number} input.strcUSD
 * @param {number} input.otherUSD
 * @param {number} input.etfUSD
 * @param {number} input.retailNetUsd
 * @param {number} input.dailyMining
 * @param {number} input.monthIndex
 * @param {number} input.totalMonths
 * @param {number} input.treasury
 * @param {number} input.etfBtc
 * @param {number} input.momentumReturn
 * @param {import("./simTypes.js").SimParams} input.parameters
 */
export function computeMonthlyDemandFromUsd(input) {
  const price = input.price;
  const liquid = input.liquid;
  const parameters = input.parameters;
  const dailyMining = input.dailyMining;

  const dailyMiningMonthly = dailyMining * 30;
  const minerSales = dailyMiningMonthly * (parameters.minerSellPct / 100);
  const coinsLost = liquid * (parameters.annualLossRate / 100 / MONTHS_PER_YEAR);

  const sensitivity = Math.max(0, parameters.priceSensitiveDemandElasticity ?? 0);
  const priceDemandScale =
    sensitivity === 0 ? 1 : Math.pow(Math.min(1, parameters.startPrice / Math.max(price, 1)), sensitivity);
  const positiveMomentumReturn = Math.max(0, input.momentumReturn ?? 0);
  const maxMomentumBoost = Math.max(0, parameters.maxMomentumBoostPct ?? 0) / 100;
  const momentumDemandScale =
    1 + Math.min(maxMomentumBoost, positiveMomentumReturn * Math.max(0, parameters.momentumDemandBoost ?? 0));
  const positiveDemandScale = priceDemandScale * momentumDemandScale;

  const etfFlowSigma = monthlySigmaFromAnnual((parameters.etfFlowVolatilityPct ?? 0) / 100);
  const randomSeed = parameters.randomSeed ?? 0;
  const etfFlowShock = seededClampedNormal(randomSeed + 17, (input.monthIndex ?? 0) + 911, 3.5);
  const etfFlowMultiplier = Math.max(-2, 1 + etfFlowShock * etfFlowSigma);
  const totalMonths = Math.max(0, input.totalMonths ?? 0);
  const stressMonths = getEtfStressRedemptionMonths(totalMonths, parameters.etfStressRedemptionCount);
  const etfShockBtc =
    stressMonths.includes(input.monthIndex ?? -1)
      ? (input.etfBtc ?? 0) * Math.max(0, parameters.etfOutflowShockPct ?? 0) / 100
      : 0;

  const strcBtcDesired = (input.strcUSD * positiveDemandScale) / price;
  const otherBtcDesired = (input.otherUSD * positiveDemandScale) / price;
  const etfNetBtcDesired = (input.etfUSD * positiveDemandScale * etfFlowMultiplier) / price - etfShockBtc;
  const etfBuyRaw = Math.max(0, etfNetBtcDesired);
  const etfSellRaw = Math.min(input.etfBtc ?? 0, Math.max(0, -etfNetBtcDesired));
  const organicRetailBtcRaw =
    input.retailNetUsd >= 0 ? (input.retailNetUsd * positiveDemandScale) / price : input.retailNetUsd / price;
  const retailBuyRaw = Math.max(0, organicRetailBtcRaw);
  const retailSellRaw = Math.max(0, -organicRetailBtcRaw);

  const institutionCapBtc =
    parameters.circulatingSupply * Math.max(0, parameters.institutionalAllocationCapPct ?? 100) / 100;
  const institutionalRoom = Math.max(0, institutionCapBtc - (input.treasury ?? 0) - (input.etfBtc ?? 0));
  const grossInstitutionalBuyRaw = strcBtcDesired + otherBtcDesired + etfBuyRaw;
  const institutionalScale =
    grossInstitutionalBuyRaw > 0 ? Math.min(1, institutionalRoom / grossInstitutionalBuyRaw) : 1;

  const strcBtcRaw = strcBtcDesired * institutionalScale;
  const otherBtcRaw = otherBtcDesired * institutionalScale;
  const etfBtcBuyRaw = etfBuyRaw * institutionalScale;
  const grossHoardingBtcRaw = strcBtcRaw + otherBtcRaw + etfBtcBuyRaw + retailBuyRaw;

  const capOn = parameters.capBuyingToLiquidFloat !== false;
  let buyScale = 1;
  if (capOn && grossHoardingBtcRaw > 0) {
    const grossBuyMaximum = liquid - LIQ_FLOOR + minerSales + retailSellRaw + etfSellRaw - coinsLost;
    buyScale = grossBuyMaximum <= 0 ? 0 : Math.min(1, grossBuyMaximum / grossHoardingBtcRaw);
  }

  const strcBtc = strcBtcRaw * buyScale;
  const otherBtc = otherBtcRaw * buyScale;
  const etfBuyExecuted = etfBtcBuyRaw * buyScale;
  const etfBtc2 = etfBuyExecuted - etfSellRaw;
  const retailBuyExecuted = retailBuyRaw * buyScale;
  const organicRetailNetBtcExecuted = retailBuyExecuted + Math.min(0, organicRetailBtcRaw);
  const grossHoardingExecuted = strcBtc + otherBtc + etfBuyExecuted + retailBuyExecuted;
  const unmetBuyBtcMonthly = grossHoardingBtcRaw - grossHoardingExecuted;
  const buyRationPercent = grossHoardingBtcRaw > 0 ? (unmetBuyBtcMonthly / grossHoardingBtcRaw) * 100 : 0;

  const referenceLiquid = Math.max(liquid, LIQ_FLOOR);
  let unmetDemandPremiumMonthly = 0;
  if (capOn && unmetBuyBtcMonthly > 0) {
    const strength =
      typeof parameters.unmetDemandPriceStrength === "number" ? parameters.unmetDemandPriceStrength : 0.6;
    const maxPremiumFraction =
      (typeof parameters.unmetPremiumMaxMonthlyPct === "number" ? parameters.unmetPremiumMaxMonthlyPct : 8) /
      100;
    const tightness = unmetBuyBtcMonthly / referenceLiquid;
    unmetDemandPremiumMonthly = Math.min(tightness * strength, maxPremiumFraction);
  }

  const strcDayBtc = strcBtc / 30;
  const otherDayBtc = otherBtc / 30;
  const etfDayBtc = etfBtc2 / 30;
  const minerSellDay = dailyMining * (parameters.minerSellPct / 100);
  const retailBuyDay = Math.max(0, organicRetailNetBtcExecuted) / 30;
  const retailSellDay = Math.max(0, -organicRetailNetBtcExecuted) / 30;
  const etfSellDay = etfSellRaw / 30;
  const totalBuyDay = strcDayBtc + otherDayBtc + Math.max(0, etfDayBtc) + retailBuyDay;
  const totalSellDay = minerSellDay + retailSellDay + etfSellDay;

  return {
    strcBtc,
    otherBtc,
    etfBtc2,
    organicRetailNetBtcExecuted,
    grossHoardingBtcRaw,
    grossHoardingExecuted,
    unmetBuyBtcMonthly,
    buyRationPercent,
    unmetDemandPremiumMonthly,
    coinsLost,
    minerSales,
    strcDayBtc,
    otherDayBtc,
    etfDayBtc,
    minerSellDay,
    etfSellDay,
    totalBuyDay,
    totalSellDay,
    buyScale,
    institutionalScale,
    priceDemandScale,
    momentumDemandScale,
    positiveDemandScale,
    etfFlowMultiplier,
  };
}
