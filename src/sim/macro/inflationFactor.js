import { MONTHS_PER_YEAR } from "../config/constants.js";

/**
 * Compound inflation from the simulation anchor (month 0) to a given month index.
 * @param {number} annualInflationPct
 * @param {number} monthIndex
 * @returns {number}
 */
export function inflationFactorFromMonth(annualInflationPct, monthIndex) {
  return inflationFactorFromYears(annualInflationPct, monthIndex / MONTHS_PER_YEAR);
}

/**
 * Compound inflation from the anchor year over fractional years.
 * @param {number} annualInflationPct
 * @param {number} years
 * @returns {number}
 */
export function inflationFactorFromYears(annualInflationPct, years) {
  if (years <= 0) return 1;
  return Math.pow(1 + annualInflationPct / 100, years);
}
