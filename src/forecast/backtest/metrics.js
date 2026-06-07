/**
 * Phase 2 — forecast evaluation metrics (CRPS, log score, calibration).
 * Stubs exported for future backtest script integration.
 */

/**
 * Continuous Ranked Probability Score for one observation.
 * @param {number} realized
 * @param {{ price: number, density: number }[]} pdf
 * @returns {number}
 */
export function crpsFromPdf(realized, pdf) {
  void realized;
  void pdf;
  throw new Error("CRPS not implemented — Phase 2.");
}

/**
 * Log score (negative log predictive density) at realized price.
 * @param {number} realized
 * @param {{ price: number, density: number }[]} pdf
 * @returns {number}
 */
export function logScoreFromPdf(realized, pdf) {
  void realized;
  void pdf;
  throw new Error("Log score not implemented — Phase 2.");
}

/**
 * Bin realized outcomes against forecast P(up) deciles for calibration plots.
 * @param {{ predictedProbUp: number, realizedUp: boolean }[]} rows
 * @returns {{ bins: unknown[] }}
 */
export function calibrationBins(rows) {
  void rows;
  throw new Error("Calibration bins not implemented — Phase 2.");
}
