/**
 * Full parameter set after {@link import("./constants.js").withParamDefaults}.
 * @typedef {typeof import("./constants.js").DEFAULTS} SimParams
 */

/**
 * Output of {@link import("./monthlyDemandFromUsd.js").computeMonthlyDemandFromUsd}.
 * @typedef {Object} MonthlyDemandSnapshot
 * @property {number} strcBtc
 * @property {number} otherBtc
 * @property {number} etfBtc2
 * @property {number} organicRetailNetBtcExecuted
 * @property {number} grossHoardingBtcRaw
 * @property {number} grossHoardingExecuted
 * @property {number} unmetBuyBtcMonthly
 * @property {number} buyRationPercent
 * @property {number} unmetDemandPremiumMonthly
 * @property {number} coinsLost
 * @property {number} minerSales
 * @property {number} strcDayBtc
 * @property {number} otherDayBtc
 * @property {number} etfDayBtc
 * @property {number} minerSellDay
 * @property {number} totalBuyDay
 * @property {number} totalSellDay
 * @property {number} buyScale
 */

/**
 * One monthly row for charts (values rounded for display).
 * @typedef {Object} SimMonthRow
 * @property {number} year
 * @property {number} price
 * @property {number} priceReal
 * @property {number} liquidM
 * @property {number} treasuryM
 * @property {number} etfM
 * @property {number} lostM
 * @property {number} lthYoungM
 * @property {number} ancientM
 * @property {number} liquidPct
 * @property {number} strcDayBtc
 * @property {number} etfDayBtc
 * @property {number} otherDayBtc
 * @property {number} dailyMining
 * @property {number} totalBuyDay
 * @property {number} totalSellDay
 * @property {number} netDayDemand
 * @property {number} buyRationPct
 * @property {number} unmetBuyBtcM
 * @property {number} unmetPremiumPct
 */

export {};
