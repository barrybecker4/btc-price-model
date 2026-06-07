import { fetchCryptoCompareHistodayRange } from "../../data/market/cryptoCompareHistodayRange.js";
import { MS_PER_DAY } from "../features/dailyReturns.js";

const DEFAULT_LOOKBACK_DAYS = 120;

/**
 * @param {{ lookbackDays?: number, signal?: AbortSignal }} [opts]
 * @returns {Promise<import("../forecastTypes.js").DailyClosePoint[]>}
 */
export async function fetchBtcDailyCloses(opts = {}) {
  const lookbackDays = opts.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const toMs = Date.now();
  const fromMs = toMs - lookbackDays * MS_PER_DAY;
  const fromSec = Math.floor(fromMs / 1000);
  const toSec = Math.floor(toMs / 1000);
  const rows = await fetchCryptoCompareHistodayRange({ fromSec, toSec, signal: opts.signal });
  return rows.filter((r) => r.price > 0);
}
