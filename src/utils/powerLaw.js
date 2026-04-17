/**
 * Santostasi / Perrenod Bitcoin power-law reference (days since genesis block).
 * @see https://bitcoinpower.law/
 *
 * Genesis is Jan 3, 2009 UTC (common convention; exact block time shifts days only slightly).
 */

export const GENESIS_MS = Date.UTC(2009, 0, 3);

/** Log10 distance from trend for upper/lower bands: ~10^0.477 ≈ 3× and ~10^-0.477 ≈ 1/3. */
export const SIGMA_LOG10 = 0.477;

const MS_PER_DAY = 86400000;
const MIN_DAYS = 1;

/**
 * @param {number} fractionalYear Calendar year with fraction (e.g. 2026.25)
 * @returns {number} milliseconds at that instant (linear interpolation within the calendar year)
 */
export function fractionalYearToMs(fractionalYear) {
  const y = Math.floor(fractionalYear);
  const frac = fractionalYear - y;
  const yearStart = Date.UTC(y, 0, 1);
  const nextStart = Date.UTC(y + 1, 0, 1);
  return yearStart + frac * (nextStart - yearStart);
}

/**
 * @param {number} fractionalYear
 * @returns {number} days since genesis (clamped)
 */
export function daysSinceGenesis(fractionalYear) {
  const d = (fractionalYearToMs(fractionalYear) - GENESIS_MS) / MS_PER_DAY;
  return Math.max(MIN_DAYS, d);
}

/**
 * @param {number} days
 * @returns {number} USD trend price
 */
export function powerLawTrendUsd(days) {
  return Math.pow(10, -16.493) * Math.pow(days, 5.688);
}

/**
 * @param {number} days
 * @param {number} [sigma=SIGMA_LOG10]
 * @returns {{ upper: number, lower: number }}
 */
export function powerLawBoundsUsd(days, sigma = SIGMA_LOG10) {
  const trend = powerLawTrendUsd(days);
  const up = Math.pow(10, sigma);
  return {
    upper: trend * up,
    lower: trend / up,
  };
}
