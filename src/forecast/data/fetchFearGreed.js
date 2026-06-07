import { fetchJsonWithTimeout } from "../../utils/httpFetch.js";

const FNG_URL = "https://api.alternative.me/fng/?limit=30";

/**
 * @param {unknown} json
 * @returns {import("../forecastTypes.js").FearGreedPoint[]}
 */
export function parseFearGreedResponse(json) {
  const data = json?.data;
  if (!Array.isArray(data)) return [];
  /** @type {import("../forecastTypes.js").FearGreedPoint[]} */
  const points = [];
  for (const row of data) {
    const ts = Number(row.timestamp);
    const value = Number(row.value);
    if (!Number.isFinite(ts) || !Number.isFinite(value)) continue;
    points.push({
      timestampMs: ts * 1000,
      value,
      classification: String(row.value_classification ?? ""),
    });
  }
  points.sort((a, b) => a.timestampMs - b.timestampMs);
  return points;
}

/**
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<import("../forecastTypes.js").FearGreedPoint[]>}
 */
export async function fetchFearGreed(opts = {}) {
  const json = await fetchJsonWithTimeout(FNG_URL, { signal: opts.signal, timeoutMs: 15000 });
  return parseFearGreedResponse(json);
}
