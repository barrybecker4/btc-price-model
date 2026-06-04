import { inflationFactorFromMonth } from "../macro/inflationFactor.js";

/**
 * @param {number} value
 * @param {number} decimalPlaces
 */
function roundToDecimalPlaces(value, decimalPlaces) {
  const text = value.toFixed(decimalPlaces);
  return parseFloat(text);
}

/**
 * @param {object} input
 * @param {number} input.year
 * @param {number} input.price
 * @param {number} input.inflationPercent
 * @param {number} input.monthIndex
 * @param {number} input.liquid
 * @param {number} input.treasury
 * @param {number} input.etfBtc
 * @param {number} input.lostBtc
 * @param {number} input.youngLthBtc
 * @param {number} input.ancientBtc
 * @param {number} input.retailHeldBtc
 * @param {number} input.minerHeldBtc
 * @param {number} input.liquidPercentOfInitial
 * @param {import("../config/simTypes.js").MonthlyDemandSnapshot} input.demand
 * @param {number} input.dailyMining
 * @returns {import("../config/simTypes.js").SimMonthRow}
 */
export function buildSimulationRow(input) {
  const demand = input.demand;
  const inflationFactor = inflationFactorFromMonth(input.inflationPercent, input.monthIndex);
  // Sim price path is in anchor-year (today's) dollars; nominal USD = real × cumulative inflation.
  const priceReal = Math.round(input.price);
  const price = Math.round(input.price * inflationFactor);
  return {
    year: roundToDecimalPlaces(input.year, 3),
    price,
    priceReal,
    liquidM: roundToDecimalPlaces(input.liquid / 1e6, 3),
    treasuryM: roundToDecimalPlaces(input.treasury / 1e6, 3),
    etfM: roundToDecimalPlaces(input.etfBtc / 1e6, 3),
    lostM: roundToDecimalPlaces(input.lostBtc / 1e6, 3),
    lthYoungM: roundToDecimalPlaces(input.youngLthBtc / 1e6, 3),
    ancientM: roundToDecimalPlaces(input.ancientBtc / 1e6, 3),
    retailM: roundToDecimalPlaces(input.retailHeldBtc / 1e6, 3),
    minerHeldM: roundToDecimalPlaces(input.minerHeldBtc / 1e6, 3),
    liquidPct: roundToDecimalPlaces(input.liquidPercentOfInitial, 1),
    strcDayBtc: roundToDecimalPlaces(demand.strcDayBtc, 0),
    etfDayBtc: roundToDecimalPlaces(demand.etfDayBtc, 0),
    otherDayBtc: roundToDecimalPlaces(demand.otherDayBtc, 0),
    dailyMining: roundToDecimalPlaces(input.dailyMining, 1),
    totalBuyDay: roundToDecimalPlaces(demand.totalBuyDay, 0),
    totalSellDay: roundToDecimalPlaces(demand.totalSellDay, 0),
    netDayDemand: roundToDecimalPlaces(demand.totalBuyDay - demand.totalSellDay, 0),
    buyRationPct: roundToDecimalPlaces(demand.buyRationPercent, 1),
    unmetBuyBtcM: roundToDecimalPlaces(demand.unmetBuyBtcMonthly, 0),
    unmetPremiumPct: roundToDecimalPlaces(demand.unmetDemandPremiumMonthly * 100, 2),
  };
}
