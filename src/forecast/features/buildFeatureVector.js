import {
  sortDailyCloses,
  trailingLogReturn,
  trailingRealizedVolAnnual,
} from "./dailyReturns.js";

/**
 * @param {number | null | undefined} latest
 * @param {number | null | undefined} lagged
 * @returns {number | null}
 */
function deltaIfBoth(latest, lagged) {
  if (latest == null || lagged == null) return null;
  return latest - lagged;
}

/**
 * @param {import("../forecastTypes.js").FearGreedPoint[]} points
 * @param {number} days
 * @returns {number | null}
 */
function fearGreedDelta(points, days) {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.timestampMs - b.timestampMs);
  const latest = sorted[sorted.length - 1]?.value;
  const lagIdx = Math.max(0, sorted.length - 1 - days);
  const lagged = sorted[lagIdx]?.value;
  if (latest == null || lagged == null) return null;
  return latest - lagged;
}

/**
 * @param {import("../forecastTypes.js").ForecastFeatureBundle} bundle
 * @returns {import("../forecastTypes.js").FeatureVector}
 */
export function buildFeatureVector(bundle) {
  const spotUsd = bundle.spotUsd ?? 0;
  const btc = sortDailyCloses(bundle.btcDaily);
  const spy = sortDailyCloses(bundle.spyDaily);

  const rBtc1d = trailingLogReturn(btc, 1);
  const rBtc7d = trailingLogReturn(btc, 7);
  const rBtc30d = trailingLogReturn(btc, 30);
  const volBtc7d = trailingRealizedVolAnnual(btc, 7);
  const volBtc30d = trailingRealizedVolAnnual(btc, 30);

  const rSpy1d = spy.length ? trailingLogReturn(spy, 1) : 0;
  const rSpy7d = spy.length ? trailingLogReturn(spy, 7) : 0;
  const volSpy30d = spy.length ? trailingRealizedVolAnnual(spy, 30) : 0.15;

  const fngSorted = [...bundle.fearGreed].sort((a, b) => a.timestampMs - b.timestampMs);
  const fearGreed = fngSorted.length ? fngSorted[fngSorted.length - 1].value : null;
  const fearGreedDelta7d = fearGreedDelta(bundle.fearGreed, 7);

  let btcDominance = bundle.globalCrypto?.btcDominancePct ?? null;
  let dominanceDelta30d = null;
  if (btcDominance != null && bundle.globalCrypto) {
    dominanceDelta30d = bundle.globalCrypto.marketCapChangePct24h / 100;
  }

  return {
    spotUsd,
    rBtc1d,
    rBtc7d,
    rBtc30d,
    volBtc7d,
    volBtc30d,
    rSpy1d,
    rSpy7d,
    volSpy30d,
    fearGreed,
    fearGreedDelta7d,
    btcDominance,
    dominanceDelta30d,
    isFomcWeek: bundle.fomc.isFomcWeek,
    daysToDecision: bundle.fomc.daysToNextDecision,
    fedStance: bundle.fomc.policy.stance,
    expectedNextMove: bundle.fomc.policy.expectedNextMove,
    degradedFeatures: bundle.degradedFeatures.slice(),
    fetchedAtMs: bundle.fetchedAtMs,
  };
}

export { deltaIfBoth };
