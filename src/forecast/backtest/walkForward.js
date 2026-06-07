/**
 * Phase 2 — walk-forward backtest harness (not yet implemented).
 *
 * For each historical day D:
 * 1. Build features from data available ≤ D
 * 2. Run estimateDistributionParams + buildHorizonPdf for 24h and 168h
 * 3. Compare forecast distribution to realized price at D+1 and D+7
 *
 * @see scripts/backtest-forecast.mjs
 * @see metrics.js
 */

/**
 * @typedef {Object} WalkForwardOptions
 * @property {number} startMs
 * @property {number} endMs
 * @property {number} [stepDays]
 */

/**
 * Placeholder for Phase 2 walk-forward backtest.
 * @param {WalkForwardOptions} _opts
 * @returns {Promise<{ status: 'not_implemented' }>}
 */
export async function runWalkForwardBacktest(opts) {
  void opts;
  throw new Error(
    "Walk-forward backtest is Phase 2. Run npm run backtest:forecast when implemented.",
  );
}
