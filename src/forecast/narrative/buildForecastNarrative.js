import { coefficients, zScore } from "../model/estimateDistributionParams.js";

/**
 * @param {number} r
 * @returns {string}
 */
function formatPct(r) {
  return `${(r * 100).toFixed(1)}%`;
}

/**
 * @param {import("../forecastTypes.js").FeatureVector} features
 * @param {import("../forecastTypes.js").HorizonPdf} horizon168h
 * @param {import("../forecastTypes.js").HorizonPdf} horizon24h
 * @returns {import("../forecastTypes.js").ForecastNarrative}
 */
export function buildForecastNarrative(features, horizon168h, horizon24h) {
  const stats = coefficients.zScoreStats;
  /** @type {import("../forecastTypes.js").NarrativeFactor[]} */
  const factors = [];

  const zMom = zScore(features.rBtc7d, stats.rBtc7d.mean, stats.rBtc7d.std);
  factors.push({
    id: "btc_momentum",
    weight: Math.abs(zMom * coefficients.horizon168h.betaMom),
    text: `7-day BTC return ${formatPct(features.rBtc7d)} ${features.rBtc7d >= 0 ? "pulls the median upward" : "weighs on the median"}.`,
  });

  const zRisk = zScore(features.rSpy1d, stats.rSpy1d.mean, stats.rSpy1d.std);
  factors.push({
    id: "risk_appetite",
    weight: Math.abs(zRisk * coefficients.horizon168h.betaRisk),
    text: `S&P 1-day move ${formatPct(features.rSpy1d)} ${features.rSpy1d >= 0 ? "supports risk-on conditions" : "signals risk-off pressure"}.`,
  });

  if (features.fearGreed != null) {
    const fgCentered = features.fearGreed - 50;
    const zFg = zScore(fgCentered, stats.fearGreedCentered.mean, stats.fearGreedCentered.std);
    factors.push({
      id: "sentiment",
      weight: Math.abs(zFg * coefficients.horizon168h.betaFg),
      text: `Crypto Fear & Greed at ${features.fearGreed}${features.fearGreedDelta7d != null ? ` (${features.fearGreedDelta7d >= 0 ? "+" : ""}${features.fearGreedDelta7d.toFixed(0)} over 7d)` : ""}.`,
    });
  }

  if (features.isFomcWeek) {
    const days =
      features.daysToDecision != null ? `${features.daysToDecision} day(s) to decision` : "during FOMC week";
    factors.push({
      id: "fomc",
      weight: 0.35,
      text: `FOMC decision ${days}; policy uncertainty widens the 7-day band. Fed stance: ${features.fedStance}; expected next move: ${features.expectedNextMove}.`,
    });
  }

  if (features.btcDominance != null) {
    factors.push({
      id: "dominance",
      weight: 0.08,
      text: `BTC dominance ${features.btcDominance.toFixed(1)}%.`,
    });
  }

  if (horizon168h.mixtureActive) {
    factors.push({
      id: "mixture",
      weight: 0.2,
      text: "Stress mixture active (FOMC, sentiment, or risk-off signals) — heavier left-tail weight in the distribution.",
    });
  }

  factors.sort((a, b) => b.weight - a.weight);

  const move168 =
    horizon168h.spotUsd > 0 ? horizon168h.median / horizon168h.spotUsd - 1 : 0;
  const headline = `Median 7-day (168h) forecast: ${move168 >= 0 ? "+" : ""}${formatPct(move168)}${features.isFomcWeek ? " with elevated uncertainty during FOMC week" : ""}.`;

  /** @type {string[]} */
  const warnings = [];
  if (features.degradedFeatures.includes("spyDaily")) {
    warnings.push("SPY history unavailable; volatility prior widened.");
  }
  if (features.degradedFeatures.includes("fearGreed")) {
    warnings.push("Fear & Greed index unavailable; sentiment factor omitted.");
  }
  if (features.degradedFeatures.includes("globalCrypto")) {
    warnings.push("CoinGecko global stats unavailable; dominance omitted.");
  }
  if (features.degradedFeatures.includes("spotFallbackFromBtcDaily")) {
    warnings.push("Live spot unavailable; using last daily close as anchor.");
  }

  const sigmaRatio =
    horizon24h.p90 - horizon24h.p10 > 0
      ? (horizon168h.p90 - horizon168h.p10) / (horizon24h.p90 - horizon24h.p10)
      : 1;
  const horizonComparison =
    sigmaRatio > 2.2
      ? "7-day uncertainty is substantially wider than 24h, as expected for the longer horizon."
      : "7-day and 24h uncertainty bands are relatively aligned; near-term vol may dominate.";

  return {
    headline,
    factors: factors.slice(0, 6),
    warnings,
    horizonComparison,
    disclaimer:
      "Exploratory short-term model — not financial advice. Fed outlook uses bundled policy snapshot, not live FedWatch probabilities.",
  };
}
