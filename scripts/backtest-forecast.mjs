#!/usr/bin/env node
/**
 * Offline walk-forward backtest for the short-term forecast model.
 *
 * Usage:
 *   npm run backtest:forecast
 *   npm run backtest:forecast -- --holdout 180 --step 3 --max-samples 50
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadBacktestHistory } from "../src/forecast/backtest/loadBacktestHistory.js";
import {
  formatWalkForwardSummary,
  runWalkForwardBacktest,
} from "../src/forecast/backtest/walkForward.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = join(__dirname, "../src/forecast/backtest/backtestReport.json");

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next != null && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function numArg(args, key, fallback) {
  const v = args[key];
  if (v == null || v === true) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const historyDays = numArg(args, "history", 730);
  const holdoutDays = numArg(args, "holdout", 365);
  const stepDays = numArg(args, "step", 7);
  const warmupDays = numArg(args, "warmup", 120);
  const maxSamples = numArg(args, "max-samples", Infinity);

  console.error(`Loading ${historyDays} days of BTC + SPY history…`);
  const { btcDaily, spyDaily } = await loadBacktestHistory({ historyDays });

  console.error(
    `Running walk-forward (warmup=${warmupDays}, holdout=${holdoutDays}, step=${stepDays})…`,
  );
  const report = runWalkForwardBacktest({
    btcDaily,
    spyDaily,
    warmupDays,
    holdoutDays,
    stepDays,
    maxSamples: Number.isFinite(maxSamples) ? maxSamples : undefined,
  });

  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(formatWalkForwardSummary(report));
  console.log("");
  console.log(`Report written to ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
