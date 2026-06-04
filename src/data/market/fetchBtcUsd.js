import { fetchJsonWithTimeout } from "../../utils/httpFetch.js";
import { parsePositiveUsdNumber } from "../../utils/parseUsd.js";

/**
 * Fetches spot BTC/USD from a public API (no key). CoinGecko first, Coinbase fallback.
 * Rethrows {@link DOMException} `AbortError` so callers can distinguish user abort from outage.
 * @param {AbortSignal} [signal]
 * @returns {Promise<number | null>}
 */
export async function fetchBtcUsd(signal) {
  const fromGecko = await tryCoinGecko(signal);
  if (fromGecko != null) return fromGecko;
  return tryCoinbase(signal);
}

async function tryCoinGecko(signal) {
  try {
    const data = await fetchJsonWithTimeout(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      { signal, timeoutMs: 15000 },
    );
    const bitcoin = data.bitcoin;
    if (!bitcoin) return null;
    return parsePositiveUsdNumber(bitcoin.usd);
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    return null;
  }
}

async function tryCoinbase(signal) {
  try {
    const data = await fetchJsonWithTimeout("https://api.coinbase.com/v2/prices/BTC-USD/spot", { signal, timeoutMs: 15000 });
    const payload = data.data;
    if (!payload) return null;
    return parsePositiveUsdNumber(payload.amount);
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    return null;
  }
}
