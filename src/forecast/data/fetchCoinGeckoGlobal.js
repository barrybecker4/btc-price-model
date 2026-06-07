import { fetchJsonWithTimeout } from "../../utils/httpFetch.js";

/**
 * @param {unknown} json
 * @returns {import("../forecastTypes.js").CoinGeckoGlobalSnapshot | null}
 */
export function parseCoinGeckoGlobal(json) {
  const data = json?.data;
  if (!data) return null;
  const dominance = Number(data.market_cap_percentage?.btc);
  const change = Number(data.market_cap_change_percentage_24h_usd);
  if (!Number.isFinite(dominance)) return null;
  return {
    btcDominancePct: dominance,
    marketCapChangePct24h: Number.isFinite(change) ? change : 0,
  };
}

/**
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<import("../forecastTypes.js").CoinGeckoGlobalSnapshot | null>}
 */
export async function fetchCoinGeckoGlobal(opts = {}) {
  try {
    const json = await fetchJsonWithTimeout("https://api.coingecko.com/api/v3/global", {
      signal: opts.signal,
      timeoutMs: 15000,
    });
    return parseCoinGeckoGlobal(json);
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    return null;
  }
}
