import { fetchCryptoCompareHistodayRange } from "../../data/market/cryptoCompareHistodayRange.js";
import { parseSp500CsvDaily } from "../data/fetchSpyDailyCloses.js";

const MS_PER_DAY = 86400000;
const SP500_CSV_URL = "https://raw.githubusercontent.com/datasets/s-and-p-500/master/data/data.csv";

/**
 * @param {number} timeoutMs
 * @returns {AbortSignal}
 */
function timeoutSignal(timeoutMs) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

/**
 * @param {string} url
 * @param {AbortSignal} signal
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, signal) {
  const res = await fetch(url, { signal });
  return res;
}

/**
 * Load aligned daily BTC and SPY history for backtesting.
 * @param {{ historyDays?: number, signal?: AbortSignal }} [opts]
 * @returns {Promise<{ btcDaily: import("../forecastTypes.js").DailyClosePoint[], spyDaily: import("../forecastTypes.js").DailyClosePoint[] }>}
 */
export async function loadBacktestHistory(opts = {}) {
  const historyDays = opts.historyDays ?? 730;
  const signal = opts.signal ?? timeoutSignal(120_000);
  const toMs = Date.now();
  const fromMs = toMs - historyDays * MS_PER_DAY;
  const fromSec = Math.floor(fromMs / 1000);
  const toSec = Math.floor(toMs / 1000);

  const [btcDaily, spyDaily] = await Promise.all([
    fetchCryptoCompareHistodayRange({ fromSec, toSec, signal }),
    loadSpyDaily(fromMs, toMs, signal),
  ]);

  if (btcDaily.length < 150) {
    throw new Error(`Insufficient BTC history (${btcDaily.length} days).`);
  }

  return { btcDaily, spyDaily };
}

/**
 * @param {number} fromMs
 * @param {number} toMs
 * @param {AbortSignal} signal
 * @returns {Promise<import("../forecastTypes.js").DailyClosePoint[]>}
 */
async function loadSpyDaily(fromMs, toMs, signal) {
  const res = await fetchWithTimeout(SP500_CSV_URL, signal);
  if (!res.ok) throw new Error(`SPY CSV failed (${res.status})`);
  const csv = await res.text();
  return parseSp500CsvDaily(csv, { fromMs, toMs });
}
