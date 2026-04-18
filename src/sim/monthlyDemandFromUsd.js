import { MONTHS_PER_YEAR } from "./constants.js";
import { LIQ_FLOOR } from "./holderBuckets.js";

/**
 * @param {object} input
 * @param {number} input.price
 * @param {number} input.liquid
 * @param {number} input.strcUSD
 * @param {number} input.otherUSD
 * @param {number} input.etfUSD
 * @param {number} input.retailNetUsd
 * @param {number} input.dailyMining
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

  const strcBtcRaw = input.strcUSD / price;
  const otherBtcRaw = input.otherUSD / price;
  const etfBtc2Raw = input.etfUSD / price;
  const organicRetailBtcRaw = input.retailNetUsd / price;
  const retailBuyRaw = Math.max(0, organicRetailBtcRaw);
  const retailSellRaw = Math.max(0, -organicRetailBtcRaw);
  const grossHoardingBtcRaw = strcBtcRaw + otherBtcRaw + etfBtc2Raw + retailBuyRaw;

  const capOn = parameters.capBuyingToLiquidFloat !== false;
  let buyScale = 1;
  if (capOn && grossHoardingBtcRaw > 0) {
    const grossBuyMaximum = liquid - LIQ_FLOOR + minerSales + retailSellRaw - coinsLost;
    buyScale = grossBuyMaximum <= 0 ? 0 : Math.min(1, grossBuyMaximum / grossHoardingBtcRaw);
  }

  const strcBtc = strcBtcRaw * buyScale;
  const otherBtc = otherBtcRaw * buyScale;
  const etfBtc2 = etfBtc2Raw * buyScale;
  const retailBuyExecuted = retailBuyRaw * buyScale;
  const organicRetailNetBtcExecuted = retailBuyExecuted + Math.min(0, organicRetailBtcRaw);
  const grossHoardingExecuted = strcBtc + otherBtc + etfBtc2 + retailBuyExecuted;
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
  const totalBuyDay = strcDayBtc + otherDayBtc + etfDayBtc + retailBuyDay;
  const totalSellDay = minerSellDay + retailSellDay;

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
    totalBuyDay,
    totalSellDay,
    buyScale,
  };
}
