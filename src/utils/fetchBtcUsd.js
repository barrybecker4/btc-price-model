import { parsePositiveUsdNumber } from "./parseUsd.js";

/**
 * Fetches spot BTC/USD from a public API (no key). CoinGecko first, Coinbase fallback.
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
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      { signal },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const bitcoin = data.bitcoin;
    if (!bitcoin) return null;
    return parsePositiveUsdNumber(bitcoin.usd);
  } catch {
    return null;
  }
}

async function tryCoinbase(signal) {
  try {
    const res = await fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot", { signal });
    if (!res.ok) return null;
    const data = await res.json();
    const payload = data.data;
    if (!payload) return null;
    return parsePositiveUsdNumber(payload.amount);
  } catch {
    return null;
  }
}
