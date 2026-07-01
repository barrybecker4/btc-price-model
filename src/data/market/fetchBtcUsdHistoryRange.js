import { fetchCoinGeckoMarketChartRange } from "./coingeckoMarketChartRange.js";
import { fetchCryptoCompareHistodayRange } from "./cryptoCompareHistodayRange.js";
import { downsampleToMonthly } from "./downsampleToMonthly.js";
import { utcMsToBtcChartYear } from "../../charts/timeAxis.js";
import btcMonthlyFallback from "../btcMonthlyFallback.json";

function fallbackRange({ fromMs, toMs }) {
  const fromYear = utcMsToBtcChartYear(fromMs);
  const toYear = utcMsToBtcChartYear(toMs);
  return btcMonthlyFallback.filter((row) => row.year >= fromYear && row.year <= toYear);
}

function mapDailyToChartRows(raw) {
  const monthly = downsampleToMonthly(raw);
  return monthly.map((point) => ({
    year: utcMsToBtcChartYear(point.timestampMs),
    /** Never 0: log-scale charts require strictly positive values (early BTC under $0.50 rounds to 0). */
    price: Math.max(0.01, Math.round(point.price)),
  }));
}

/**
 * Fetches BTC/USD daily history and returns monthly chart rows (fractional year + rounded nominal price).
 * Tries CoinGecko (if `VITE_COINGECKO_DEMO_API_KEY`), then CryptoCompare (if `VITE_CRYPTOCOMPARE_API_KEY`),
 * then bundled monthly fallback (2011–present; no API key).
 * @param {{ fromMs: number, toMs: number, signal?: AbortSignal }} opts
 * @returns {Promise<{ year: number, price: number }[]>}
 */
export async function fetchBtcUsdHistoryRange({ fromMs, toMs, signal }) {
  const hasGeckoKey = Boolean(import.meta.env.VITE_COINGECKO_DEMO_API_KEY);
  const hasCcKey = Boolean(import.meta.env.VITE_CRYPTOCOMPARE_API_KEY);
  let raw = null;

  if (hasGeckoKey) {
    try {
      raw = await fetchCoinGeckoMarketChartRange({ fromMs, toMs, signal });
    } catch {
      raw = null;
    }
  }

  if (!raw?.length && hasCcKey) {
    try {
      const fromSec = Math.floor(fromMs / 1000);
      const toSec = Math.floor(toMs / 1000);
      raw = await fetchCryptoCompareHistodayRange({ fromSec, toSec, signal });
    } catch {
      raw = null;
    }
  }

  if (raw?.length) {
    return mapDailyToChartRows(raw);
  }

  const fallback = fallbackRange({ fromMs, toMs });
  if (fallback.length) return fallback;

  throw new Error("No historical price data returned.");
}
