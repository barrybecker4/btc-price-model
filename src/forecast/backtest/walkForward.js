import { buildFeatureVector } from "../features/buildFeatureVector.js";
import { estimateDistributionParams } from "../model/estimateDistributionParams.js";
import { buildHorizonPdf } from "../model/mixturePdf.js";
import { buildBaselineRandomWalkPdf } from "./baselineRandomWalk.js";
import {
  buildHistoricalBundle,
  indexThrough,
  sliceDailyThrough,
} from "./buildHistoricalBundle.js";
import {
  crpsFromPdf,
  logScoreFromPdf,
  mean,
  medianAbsPctError,
  summarizeHorizonMetrics,
} from "./metrics.js";

/**
 * @typedef {Object} HorizonMetricSummary
 * @property {number} crps
 * @property {number} logScore
 * @property {number} medianMape
 * @property {number} sampleCount
 * @property {ReturnType<import("./metrics.js").calibrationBins>} calibration
 */

/**
 * @typedef {Object} WalkForwardOptions
 * @property {import("../forecastTypes.js").DailyClosePoint[]} btcDaily
 * @property {import("../forecastTypes.js").DailyClosePoint[]} spyDaily
 * @property {number} [warmupDays] — min BTC history before first forecast (default 120)
 * @property {number} [holdoutDays] — trailing days to evaluate (default 365)
 * @property {number} [stepDays] — stride between forecast days (default 7)
 * @property {number} [maxSamples] — cap evaluations for speed (default unlimited)
 */

/**
 * @typedef {Object} WalkForwardReport
 * @property {string} generatedAt
 * @property {{ warmupDays: number, holdoutDays: number, stepDays: number, sampleCount: number, firstDate: string, lastDate: string }} config
 * @property {{ horizon24h: HorizonMetricSummary, horizon168h: HorizonMetricSummary }} model
 * @property {{ horizon24h: HorizonMetricSummary, horizon168h: HorizonMetricSummary }} baseline
 * @property {{ crps24h: number, crps168h: number, logScore24h: number, logScore168h: number, medianMape24h: number, medianMape168h: number }} modelVsBaseline
 * @property {string[]} notes
 */

const MS_PER_DAY = 86400000;

/**
 * @param {number} ms
 * @returns {string}
 */
function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * @param {import("../forecastTypes.js").HorizonPdf} forecast
 * @param {number} realized
 * @param {number} spotUsd
 */
function scoreForecast(forecast, realized, spotUsd) {
  return {
    crps: crpsFromPdf(realized, forecast.pdf),
    logScore: logScoreFromPdf(realized, forecast.pdf),
    medianMape: medianAbsPctError(forecast.median, realized),
    calibrationRow: {
      predictedProbUp: forecast.probUp,
      realizedUp: realized > spotUsd,
    },
  };
}

/**
 * Walk-forward backtest comparing full model vs historical-vol baseline.
 * @param {WalkForwardOptions} opts
 * @returns {WalkForwardReport}
 */
export function runWalkForwardBacktest(opts) {
  const btcDaily = [...opts.btcDaily].sort((a, b) => a.timestampMs - b.timestampMs);
  const spyDaily = [...opts.spyDaily].sort((a, b) => a.timestampMs - b.timestampMs);
  const warmupDays = opts.warmupDays ?? 120;
  const holdoutDays = opts.holdoutDays ?? 365;
  const stepDays = opts.stepDays ?? 7;
  const maxSamples = opts.maxSamples ?? Infinity;

  if (btcDaily.length < warmupDays + 8) {
    throw new Error("Insufficient BTC history for walk-forward backtest.");
  }

  const lastMs = btcDaily[btcDaily.length - 1].timestampMs;
  const holdoutStartMs = lastMs - holdoutDays * MS_PER_DAY;

  /** @type {number[]} */
  const crps24 = [];
  const crps168 = [];
  const log24 = [];
  const log168 = [];
  const mape24 = [];
  const mape168 = [];
  /** @type {{ predictedProbUp: number, realizedUp: boolean }[]} */
  const cal24 = [];
  const cal168 = [];

  const bCrps24 = [];
  const bCrps168 = [];
  const bLog24 = [];
  const bLog168 = [];
  const bMape24 = [];
  const bMape168 = [];

  let firstEvalDate = null;
  let lastEvalDate = null;
  let samples = 0;

  const startIdx = Math.max(warmupDays, indexThrough(btcDaily, holdoutStartMs));
  const endIdx = btcDaily.length - 8;

  for (let idx = startIdx; idx <= endIdx; idx += stepDays) {
    if (samples >= maxSamples) break;

    const asOfMs = btcDaily[idx].timestampMs;
    const bundle = buildHistoricalBundle(asOfMs, btcDaily, spyDaily);
    if (!bundle) continue;

    const btcThrough = sliceDailyThrough(btcDaily, asOfMs);
    const spot = bundle.spotUsd;

    const future1 = btcDaily[idx + 1]?.price ?? null;
    const future7 = btcDaily[idx + 7]?.price ?? null;
    if (future1 == null || future7 == null) continue;

    const features = buildFeatureVector(bundle);
    const params24 = estimateDistributionParams(features, "24h");
    const params168 = estimateDistributionParams(features, "168h");
    const forecast24 = buildHorizonPdf("24h", 24, params24, spot);
    const forecast168 = buildHorizonPdf("168h", 168, params168, spot);

    const baseline24 = buildBaselineRandomWalkPdf(btcThrough, spot, "24h");
    const baseline168 = buildBaselineRandomWalkPdf(btcThrough, spot, "168h");

    const s24 = scoreForecast(forecast24, future1, spot);
    const s168 = scoreForecast(forecast168, future7, spot);
    const sb24 = scoreForecast(baseline24, future1, spot);
    const sb168 = scoreForecast(baseline168, future7, spot);

    crps24.push(s24.crps);
    crps168.push(s168.crps);
    log24.push(s24.logScore);
    log168.push(s168.logScore);
    mape24.push(s24.medianMape);
    mape168.push(s168.medianMape);
    cal24.push(s24.calibrationRow);
    cal168.push(s168.calibrationRow);

    bCrps24.push(sb24.crps);
    bCrps168.push(sb168.crps);
    bLog24.push(sb24.logScore);
    bLog168.push(sb168.logScore);
    bMape24.push(sb24.medianMape);
    bMape168.push(sb168.medianMape);

    if (firstEvalDate == null) firstEvalDate = isoDate(asOfMs);
    lastEvalDate = isoDate(asOfMs);
    samples++;
  }

  if (samples === 0) {
    throw new Error("No walk-forward samples produced; widen holdout or reduce warmup.");
  }

  const model24 = summarizeHorizonMetrics(crps24, log24, mape24, cal24);
  const model168 = summarizeHorizonMetrics(crps168, log168, mape168, cal168);
  const base24 = summarizeHorizonMetrics(bCrps24, bLog24, bMape24, []);
  const base168 = summarizeHorizonMetrics(bCrps168, bLog168, bMape168, []);

  return {
    generatedAt: new Date().toISOString(),
    config: {
      warmupDays,
      holdoutDays,
      stepDays,
      sampleCount: samples,
      firstDate: firstEvalDate ?? "",
      lastDate: lastEvalDate ?? "",
    },
    model: { horizon24h: model24, horizon168h: model168 },
    baseline: { horizon24h: base24, horizon168h: base168 },
    modelVsBaseline: {
      crps24h: base24.crps - model24.crps,
      crps168h: base168.crps - model168.crps,
      logScore24h: base24.logScore - model24.logScore,
      logScore168h: base168.logScore - model168.logScore,
      medianMape24h: base24.medianMape - model24.medianMape,
      medianMape168h: base168.medianMape - model168.medianMape,
    },
    notes: [
      "Fear/Greed and CoinGecko global use neutral defaults in backtest (no free bulk history).",
      "Fed policy snapshot is current bundled JSON, not historically accurate.",
      "Positive modelVsBaseline means model beats baseline (lower CRPS/log score/MAPE is better).",
    ],
  };
}

/**
 * @param {WalkForwardReport} report
 * @returns {string}
 */
export function formatWalkForwardSummary(report) {
  const m24 = report.model.horizon24h;
  const m168 = report.model.horizon168h;
  const b24 = report.baseline.horizon24h;
  const b168 = report.baseline.horizon168h;
  const v = report.modelVsBaseline;
  return [
    `Walk-forward: ${report.config.sampleCount} samples (${report.config.firstDate} → ${report.config.lastDate})`,
    "",
    "24h horizon:",
    `  Model    CRPS=${m24.crps.toFixed(2)}  logScore=${m24.logScore.toFixed(3)}  medianMAPE=${(m24.medianMape * 100).toFixed(2)}%  Brier=${m24.calibration.brierScore.toFixed(3)}`,
    `  Baseline CRPS=${b24.crps.toFixed(2)}  logScore=${b24.logScore.toFixed(3)}  medianMAPE=${(b24.medianMape * 100).toFixed(2)}%`,
    `  Δ vs baseline: CRPS ${v.crps24h >= 0 ? "+" : ""}${v.crps24h.toFixed(2)}  logScore ${v.logScore24h >= 0 ? "+" : ""}${v.logScore24h.toFixed(3)}`,
    "",
    "168h horizon:",
    `  Model    CRPS=${m168.crps.toFixed(2)}  logScore=${m168.logScore.toFixed(3)}  medianMAPE=${(m168.medianMape * 100).toFixed(2)}%  Brier=${m168.calibration.brierScore.toFixed(3)}`,
    `  Baseline CRPS=${b168.crps.toFixed(2)}  logScore=${b168.logScore.toFixed(3)}  medianMAPE=${(b168.medianMape * 100).toFixed(2)}%`,
    `  Δ vs baseline: CRPS ${v.crps168h >= 0 ? "+" : ""}${v.crps168h.toFixed(2)}  logScore ${v.logScore168h >= 0 ? "+" : ""}${v.logScore168h.toFixed(3)}`,
  ].join("\n");
}

export { mean };
