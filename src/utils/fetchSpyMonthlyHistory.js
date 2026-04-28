import spyMonthlyFallback from "../data/spyMonthlyFallback.json";
import { downsampleToMonthly } from "./downsampleToMonthly.js";

const SP500_CSV_URL = "https://raw.githubusercontent.com/datasets/s-and-p-500/master/data/data.csv";
const BULK_START_MS = Date.UTC(2011, 0, 1);
const BULK_END_MS = Date.UTC(2026, 11, 31);
const RECENT_START_MS = Date.UTC(2027, 0, 1);

let cachedBulkLive = null;

function toMonthYear(timestampMs) {
  const date = new Date(timestampMs);
  return parseFloat((date.getUTCFullYear() + date.getUTCMonth() / 12).toFixed(3));
}

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
    year: toMonthYear(point.timestampMs),
    price: Math.round(point.price),
  }));
}

async function fetchMonthlyRange({ fromMs, toMs, signal }) {
  if (fromMs > toMs) return [];
  const res = await fetch(SP500_CSV_URL, { signal });
  if (!res.ok) throw new Error(`SPY monthly history request failed (${res.status})`);
  const csv = await res.text();
  return parseSp500CsvMonthly(csv, { fromMs, toMs });
}

function fallbackRange({ fromMs, toMs }) {
  const fromYear = toMonthYear(fromMs);
  const toYear = toMonthYear(toMs);
  return spyMonthlyFallback.filter((row) => row.year >= fromYear && row.year <= toYear);
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
    const recentFromMs = Math.max(RECENT_START_MS, fromMs);
    const recentLive = await fetchMonthlyRange({
      fromMs: recentFromMs,
      toMs,
      signal,
    });
    const merged = new Map(fallback.map((row) => [row.year, row]));
    for (const row of cachedBulkLive) {
      if (row.year < toMonthYear(fromMs)) continue;
      if (row.year > toMonthYear(toMs)) continue;
      merged.set(row.year, row);
    }
    for (const row of recentLive) merged.set(row.year, row);
    return Array.from(merged.values()).sort((a, b) => a.year - b.year);
  } catch {
    return fallback;
  }
}

export function __resetSpyHistoryCacheForTests() {
  cachedBulkLive = null;
}
