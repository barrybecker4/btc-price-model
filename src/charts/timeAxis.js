/**
 * Shared time-axis helpers for chart rows and fetch pipelines.
 * BTC history uses {@link fractionalYearFromUtcMs} (continuous UTC calendar year).
 * SPY CSV monthly rows use {@link utcMsToSpyAxisYear} (year + month/12, 3 decimals).
 */

import { fractionalYearFromUtcMs } from "../reference/powerLaw.js";

export { fractionalYearFromUtcMs };

/**
 * Fractional year for SPY/S&P chart axis (matches legacy year + getUTCMonth()/12 rounding).
 * @param {number} timestampMs
 * @returns {number}
 */
export function utcMsToSpyAxisYear(timestampMs) {
  const date = new Date(timestampMs);
  return parseFloat((date.getUTCFullYear() + date.getUTCMonth() / 12).toFixed(3));
}

/**
 * BTC monthly chart `year` field from UTC sample time (3 decimal places).
 * @param {number} timestampMs
 */
export function utcMsToBtcChartYear(timestampMs) {
  return parseFloat(fractionalYearFromUtcMs(timestampMs).toFixed(3));
}
