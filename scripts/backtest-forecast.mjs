#!/usr/bin/env node
/**
 * Phase 2 — offline walk-forward backtest for short-term forecast model.
 *
 * Planned usage:
 *   npm run backtest:forecast
 *
 * Steps (TODO):
 * 1. Load historical BTC + SPY daily CSV
 * 2. Call walkForward.js for each day in range
 * 3. Compute CRPS / log score via metrics.js
 * 4. Write src/forecast/backtest/backtestReport.json
 * 5. Optionally tune coefficients.json
 */

console.error(
  "backtest-forecast: Phase 2 not implemented yet. See src/forecast/backtest/README.md",
);
process.exit(1);
