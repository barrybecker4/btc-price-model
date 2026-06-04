import spyMonthlyFallback from "../data/spyMonthlyFallback.json";
import { downsampleToMonthly } from "./downsampleToMonthly.js";
import { fetchWithTimeout } from "./httpFetch.js";
import { utcMsToSpyAxisYear } from "./timeAxis.js";

const SP500_CSV_URL = "https://raw.githubusercontent.com/datasets/s-and-p-500/master/data/data.csv";
const BULK_START_MS = Date.UTC(2011, 0, 1);
const BULK_END_MS = Date.UTC(2026, 11, 31);
const RECENT_START_MS = Date.UTC(2027, 0, 1);

let cachedBulkLive = null;

function parseSp500CsvMonthly(csv, { fromMs, toMs }) {
  const rows = csv.split(/\r?\n/);
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
  return downsampleToMonthly(daily).map((point) => ({
    year: utcMsToSpyAxisYear(point.timestampMs),
    price: Math.round(point.price),
  }));
}

async function fetchMonthlyRange({ fromMs, toMs, signal }) {
  if (fromMs > toMs) return [];
  const res = await fetchWithTimeout(SP500_CSV_URL, { signal, timeoutMs: 25000 });
  if (!res.ok) throw new Error(`SPY monthly history request failed (${res.status})`);
  const csv = await res.text();
  return parseSp500CsvMonthly(csv, { fromMs, toMs });
}

function fallbackRange({ fromMs, toMs }) {
  const fromYear = utcMsToSpyAxisYear(fromMs);
  const toYear = utcMsToSpyAxisYear(toMs);
  return spyMonthlyFallback.filter((row) => row.year >= fromYear && row.year <= toYear);
}

function mergeSpyRows({ fromMs, toMs, fallback, recentLive }) {
  const fromYear = utcMsToSpyAxisYear(fromMs);
  const toYear = utcMsToSpyAxisYear(toMs);
  const merged = new Map();

  const bulkInRange =
    cachedBulkLive?.filter((row) => row.year >= fromYear && row.year <= toYear) ?? [];

  // Live CSV is the S&P 500 index (~7000); static fallback is SPY ETF (~585). Never merge both.
  if (bulkInRange.length > 0) {
    for (const row of bulkInRange) merged.set(row.year, row);
  } else {
    for (const row of fallback) {
      if (row.year < fromYear || row.year > toYear) continue;
      merged.set(row.year, row);
    }
  }

  for (const row of recentLive) {
    if (row.year < fromYear || row.year > toYear) continue;
    merged.set(row.year, row);
  }

  if (merged.size === 0) {
    for (const row of fallback) {
      if (row.year < fromYear || row.year > toYear) continue;
      merged.set(row.year, row);
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.year - b.year);
}

/**
 * Fetch monthly SPY/S&P history with runtime-first strategy and static fallback.
 * Bulk segment (2011-2026) is cached in-memory after first successful load.
 * Recent segment (2027-now) is fetched each call so latest months are refreshed.
 * @param {{ fromMs: number, toMs: number, signal?: AbortSignal }} opts
 * @returns {Promise<{ year: number, price: number }[]>}
 */
export async function fetchSpyMonthlyHistory({ fromMs, toMs, signal }) {
  const fallback = fallbackRange({ fromMs, toMs });
  try {
    if (cachedBulkLive == null) {
      cachedBulkLive = await fetchMonthlyRange({
        fromMs: BULK_START_MS,
        toMs: BULK_END_MS,
        signal,
      });
    }
  } catch {
    return fallback;
  }

  let recentLive = [];
  try {
    const recentFromMs = Math.max(RECENT_START_MS, fromMs);
    recentLive = await fetchMonthlyRange({
      fromMs: recentFromMs,
      toMs,
      signal,
    });
  } catch {
    // Preserve cached bulk + JSON fallback when the optional recent segment fails.
  }

  return mergeSpyRows({ fromMs, toMs, fallback, recentLive });
}

export function __resetSpyHistoryCacheForTests() {
  cachedBulkLive = null;
}
