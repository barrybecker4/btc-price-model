import { fetchBtcUsd } from "../../data/market/fetchBtcUsd.js";
import { buildFomcContext } from "../macro/fomcContext.js";
import { fetchBtcDailyCloses } from "./fetchBtcDailyCloses.js";
import { fetchCoinGeckoGlobal } from "./fetchCoinGeckoGlobal.js";
import { fetchFearGreed } from "./fetchFearGreed.js";
import { fetchSpyDailyCloses } from "./fetchSpyDailyCloses.js";

const CACHE_TTL_MS = 10 * 60 * 1000;

/** @type {{ bucket: number, bundle: import("../forecastTypes.js").ForecastFeatureBundle } | null} */
let cachedBundle = null;

/**
 * @param {number} nowMs
 * @returns {number}
 */
function cacheBucket(nowMs) {
  return Math.floor(nowMs / CACHE_TTL_MS);
}

/**
 * @param {AbortSignal | undefined} signal
 * @param {Promise<unknown>} promise
 * @param {string} featureId
 * @returns {Promise<{ ok: true, value: unknown } | { ok: false, featureId: string, error: unknown }>}
 */
async function settleFetch(signal, promise, featureId) {
  try {
    const value = await promise;
    if (signal?.aborted) throw Object.assign(new DOMException("Aborted", "AbortError"), { cause: signal.reason });
    return { ok: true, value };
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    return { ok: false, featureId, error };
  }
}

/**
 * @param {{ signal?: AbortSignal, bypassCache?: boolean }} [opts]
 * @returns {Promise<import("../forecastTypes.js").ForecastFeatureBundle>}
 */
export async function fetchForecastFeatureBundle(opts = {}) {
  const nowMs = Date.now();
  const bucket = cacheBucket(nowMs);
  if (!opts.bypassCache && cachedBundle?.bucket === bucket) {
    return cachedBundle.bundle;
  }

  const signal = opts.signal;
  const fomc = buildFomcContext(nowMs);

  const [spotRes, btcRes, spyRes, fngRes, globalRes] = await Promise.all([
    settleFetch(signal, fetchBtcUsd(signal), "spot"),
    settleFetch(signal, fetchBtcDailyCloses({ signal }), "btcDaily"),
    settleFetch(signal, fetchSpyDailyCloses({ signal }), "spyDaily"),
    settleFetch(signal, fetchFearGreed({ signal }), "fearGreed"),
    settleFetch(signal, fetchCoinGeckoGlobal({ signal }), "globalCrypto"),
  ]);

  /** @type {string[]} */
  const degradedFeatures = [];

  /** @type {number | null} */
  let spotUsd = null;
  if (spotRes.ok && typeof spotRes.value === "number" && spotRes.value > 0) {
    spotUsd = spotRes.value;
  } else {
    degradedFeatures.push("spot");
  }

  /** @type {import("../forecastTypes.js").DailyClosePoint[]} */
  let btcDaily = [];
  if (btcRes.ok && Array.isArray(btcRes.value)) {
    btcDaily = btcRes.value;
  } else {
    degradedFeatures.push("btcDaily");
  }

  /** @type {import("../forecastTypes.js").DailyClosePoint[]} */
  let spyDaily = [];
  if (spyRes.ok && Array.isArray(spyRes.value)) {
    spyDaily = spyRes.value;
  } else {
    degradedFeatures.push("spyDaily");
  }

  /** @type {import("../forecastTypes.js").FearGreedPoint[]} */
  let fearGreed = [];
  if (fngRes.ok && Array.isArray(fngRes.value)) {
    fearGreed = fngRes.value;
  } else {
    degradedFeatures.push("fearGreed");
  }

  /** @type {import("../forecastTypes.js").CoinGeckoGlobalSnapshot | null} */
  let globalCrypto = null;
  if (globalRes.ok && globalRes.value) {
    globalCrypto = /** @type {import("../forecastTypes.js").CoinGeckoGlobalSnapshot} */ (globalRes.value);
  } else {
    degradedFeatures.push("globalCrypto");
  }

  if (spotUsd == null && btcDaily.length > 0) {
    spotUsd = btcDaily[btcDaily.length - 1].price;
    degradedFeatures.push("spotFallbackFromBtcDaily");
  }

  const bundle = {
    spotUsd,
    btcDaily,
    spyDaily,
    fearGreed,
    globalCrypto,
    fomc,
    degradedFeatures,
    fetchedAtMs: nowMs,
  };

  cachedBundle = { bucket, bundle };
  return bundle;
}

/** @internal */
export function __resetForecastFeatureCacheForTests() {
  cachedBundle = null;
}
