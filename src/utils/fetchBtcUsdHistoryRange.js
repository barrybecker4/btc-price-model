import { fetchCoinGeckoMarketChartRange } from "./coingeckoMarketChartRange.js";
import { fetchCryptoCompareHistodayRange } from "./cryptoCompareHistodayRange.js";
import { downsampleToMonthly } from "./downsampleToMonthly.js";
import { fractionalYearFromUtcMs } from "./powerLaw.js";

/**
 * Fetches BTC/USD daily history and returns monthly chart rows (fractional year + rounded nominal price).
 * Uses CryptoCompare by default (no key). If `VITE_COINGECKO_DEMO_API_KEY` is set, tries CoinGecko first.
 * @param {{ fromMs: number, toMs: number, signal?: AbortSignal }} opts
 * @returns {Promise<{ year: number, price: number }[]>}
 */
export async function fetchBtcUsdHistoryRange({ fromMs, toMs, signal }) {
  const hasGeckoKey = Boolean(import.meta.env.VITE_COINGECKO_DEMO_API_KEY);
  let raw = null;
  if (hasGeckoKey) {
    raw = await fetchCoinGeckoMarketChartRange({ fromMs, toMs, signal });
  }
  if (!raw?.length) {
    const fromSec = Math.floor(fromMs / 1000);
    const toSec = Math.floor(toMs / 1000);
    raw = await fetchCryptoCompareHistodayRange({ fromSec, toSec, signal });
  }
  if (!raw.length) {
    throw new Error("No historical price data returned.");
  }

  const monthly = downsampleToMonthly(raw);
  return monthly.map((point) => ({
    year: parseFloat(fractionalYearFromUtcMs(point.timestampMs).toFixed(3)),
    /** Never 0: log-scale charts require strictly positive values (early BTC under $0.50 rounds to 0). */
    price: Math.max(0.01, Math.round(point.price)),
  }));
}
