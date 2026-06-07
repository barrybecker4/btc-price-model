import { fetchWithTimeout } from "../../utils/httpFetch.js";
import { MS_PER_DAY } from "../features/dailyReturns.js";

const SP500_CSV_URL = "https://raw.githubusercontent.com/datasets/s-and-p-500/master/data/data.csv";
const DEFAULT_LOOKBACK_DAYS = 120;

/** @type {import("../forecastTypes.js").DailyClosePoint[] | null} */
let cachedCsvDaily = null;

/**
 * @param {string} csv
 * @param {{ fromMs: number, toMs: number }} range
 * @returns {import("../forecastTypes.js").DailyClosePoint[]}
 */
export function parseSp500CsvDaily(csv, { fromMs, toMs }) {
  const rows = csv.split(/\r?\n/);
  /** @type {import("../forecastTypes.js").DailyClosePoint[]} */
  const daily = [];
  for (let i = 1; i < rows.length; i++) {
    const line = rows[i];
    if (!line) continue;
    const [dateStr, sp500Str] = line.split(",", 3);
    const timestampMs = Date.parse(`${dateStr}T00:00:00Z`);
    const sp500 = Number(sp500Str);
    if (!Number.isFinite(timestampMs) || !Number.isFinite(sp500) || sp500 <= 0) continue;
    if (timestampMs < fromMs || timestampMs > toMs) continue;
    daily.push({ timestampMs, price: sp500 });
  }
  daily.sort((a, b) => a.timestampMs - b.timestampMs);
  return daily;
}

/**
 * @param {{ lookbackDays?: number, signal?: AbortSignal }} [opts]
 * @returns {Promise<import("../forecastTypes.js").DailyClosePoint[]>}
 */
export async function fetchSpyDailyCloses(opts = {}) {
  const lookbackDays = opts.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const toMs = Date.now();
  const fromMs = toMs - lookbackDays * MS_PER_DAY;

  if (cachedCsvDaily == null) {
    const res = await fetchWithTimeout(SP500_CSV_URL, { signal: opts.signal, timeoutMs: 25000 });
    if (!res.ok) throw new Error(`SPY daily history request failed (${res.status})`);
    const csv = await res.text();
    cachedCsvDaily = parseSp500CsvDaily(csv, { fromMs: 0, toMs: Number.MAX_SAFE_INTEGER });
  }

  return cachedCsvDaily.filter((p) => p.timestampMs >= fromMs && p.timestampMs <= toMs);
}

/** @internal */
export function __resetSpyDailyCacheForTests() {
  cachedCsvDaily = null;
}
