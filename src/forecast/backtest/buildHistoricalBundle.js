import { buildFomcContext } from "../macro/fomcContext.js";
import { MS_PER_DAY } from "../features/dailyReturns.js";

const DEFAULT_LOOKBACK_DAYS = 120;

/**
 * Slice daily closes to those with timestampMs <= asOfMs.
 * @param {import("../forecastTypes.js").DailyClosePoint[]} points
 * @param {number} asOfMs
 * @returns {import("../forecastTypes.js").DailyClosePoint[]}
 */
export function sliceDailyThrough(points, asOfMs) {
  return points.filter((p) => p.timestampMs <= asOfMs).sort((a, b) => a.timestampMs - b.timestampMs);
}

/**
 * Price at index offset from asOf day in aligned daily series.
 * @param {import("../forecastTypes.js").DailyClosePoint[]} throughAsOf
 * @param {number} offsetDays
 * @returns {number | null}
 */
export function realizedPriceAtOffset(throughAsOf, offsetDays) {
  if (throughAsOf.length <= offsetDays) return null;
  const price = throughAsOf[throughAsOf.length - 1 - offsetDays]?.price;
  if (price == null || price <= 0) return null;
  return price;
}

/**
 * Build a feature bundle as if forecasting at `asOfMs` using only past data.
 * Fear/Greed and global crypto use neutral defaults (not available historically in bulk).
 * @param {number} asOfMs
 * @param {import("../forecastTypes.js").DailyClosePoint[]} btcDaily
 * @param {import("../forecastTypes.js").DailyClosePoint[]} spyDaily
 * @returns {import("../forecastTypes.js").ForecastFeatureBundle | null}
 */
export function buildHistoricalBundle(asOfMs, btcDaily, spyDaily) {
  const btc = sliceDailyThrough(btcDaily, asOfMs);
  const spy = sliceDailyThrough(spyDaily, asOfMs);
  if (btc.length < 31) return null;

  const spotUsd = btc[btc.length - 1].price;
  if (!Number.isFinite(spotUsd) || spotUsd <= 0) return null;

  const lookbackMs = asOfMs - DEFAULT_LOOKBACK_DAYS * MS_PER_DAY;
  const btcWindow = btc.filter((p) => p.timestampMs >= lookbackMs);
  const spyWindow = spy.filter((p) => p.timestampMs >= lookbackMs);

  /** @type {string[]} */
  const degradedFeatures = [];
  if (spyWindow.length < 8) degradedFeatures.push("spyDaily");

  return {
    spotUsd,
    btcDaily: btcWindow.length ? btcWindow : btc,
    spyDaily: spyWindow,
    fearGreed: [{ timestampMs: asOfMs, value: 50, classification: "Neutral" }],
    globalCrypto: null,
    fomc: buildFomcContext(asOfMs),
    degradedFeatures,
    fetchedAtMs: asOfMs,
  };
}

/**
 * @param {import("../forecastTypes.js").DailyClosePoint[]} btcDaily
 * @param {number} index
 * @returns {number | null}
 */
export function timestampAtIndex(btcDaily, index) {
  if (index < 0 || index >= btcDaily.length) return null;
  return btcDaily[index].timestampMs;
}

/**
 * Find index of last daily close with timestampMs <= asOfMs.
 * @param {import("../forecastTypes.js").DailyClosePoint[]} btcDaily
 * @param {number} asOfMs
 * @returns {number}
 */
export function indexThrough(btcDaily, asOfMs) {
  let idx = -1;
  for (let i = 0; i < btcDaily.length; i++) {
    if (btcDaily[i].timestampMs <= asOfMs) idx = i;
    else break;
  }
  return idx;
}
