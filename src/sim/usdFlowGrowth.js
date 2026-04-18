import {
  DEFAULT_ORGANIC_BUY_GROWTH_TAPER_YEARS,
  DEFAULT_TAPER_YEARS,
  MONTHS_PER_YEAR,
} from "./constants.js";
import { effectiveAnnualGrowthTapered } from "./growthTaper.js";

/**
 * @param {number} annualPercent
 */
function monthlyGrowthMultiplier(annualPercent) {
  return 1 + annualPercent / 100 / MONTHS_PER_YEAR;
}

/**
 * Apply one month of tapered USD flow growth (treasury raises, ETF inflow, retail).
 * @param {object} state
 * @param {number} state.strcUSD
 * @param {number} state.otherUSD
 * @param {number} state.etfUSD
 * @param {number} state.retailNetUsd
 * @param {number} state.monthIndex
 * @param {import("./simTypes.js").SimParams} state.parameters
 */
export function advanceUsdFlowsForMonth(state) {
  const parameters = state.parameters;
  const tYears = state.monthIndex / MONTHS_PER_YEAR;
  const strcRate = effectiveAnnualGrowthTapered({
    r0: parameters.strcGrowthRate,
    rInf: parameters.gdpGrowth,
    tYears,
    nYears: parameters.strcGrowthTaperYears ?? DEFAULT_TAPER_YEARS,
  });
  const otherRate = effectiveAnnualGrowthTapered({
    r0: parameters.otherTreasuryGrowth,
    rInf: parameters.gdpGrowth,
    tYears,
    nYears: parameters.otherTreasuryGrowthTaperYears ?? DEFAULT_TAPER_YEARS,
  });
  const etfRate = effectiveAnnualGrowthTapered({
    r0: parameters.etfGrowthRate,
    rInf: parameters.gdpGrowth,
    tYears,
    nYears: parameters.etfGrowthTaperYears ?? DEFAULT_TAPER_YEARS,
  });
  const organicRate = effectiveAnnualGrowthTapered({
    r0: parameters.organicBuyGrowth,
    rInf: parameters.gdpGrowth,
    tYears,
    nYears: parameters.organicBuyGrowthTaperYears ?? DEFAULT_ORGANIC_BUY_GROWTH_TAPER_YEARS,
  });
  return {
    strcUSD: state.strcUSD * monthlyGrowthMultiplier(strcRate),
    otherUSD: state.otherUSD * monthlyGrowthMultiplier(otherRate),
    etfUSD: state.etfUSD * monthlyGrowthMultiplier(etfRate),
    retailNetUsd: state.retailNetUsd * monthlyGrowthMultiplier(organicRate),
  };
}
