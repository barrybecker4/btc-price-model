import { fractionalYearFromUtcMs } from "./powerLaw.js";

/**
 * Keep one sample per calendar month (UTC); last daily point in each month wins.
 * @param {{ timestampMs: number, price: number }[]} points
 * @returns {{ timestampMs: number, price: number }[]}
 */
export function downsampleToMonthly(points) {
  if (!points.length) return [];
  const sorted = [...points].sort((a, b) => a.timestampMs - b.timestampMs);
  const byMonth = new Map();
  for (const p of sorted) {
    const d = new Date(p.timestampMs);
    const key = d.getUTCFullYear() * 12 + d.getUTCMonth();
    byMonth.set(key, p);
  }
  return Array.from(byMonth.values()).sort((a, b) => a.timestampMs - b.timestampMs);
}

const CC_PAGE_LIMIT = 2000;
const MAX_PAGES = 24;
const BETWEEN_PAGES_MS = 120;

/** In `vite dev`, requests use the same-origin proxy in vite.config.js (avoids CORS on non‑Vite localhost ports, e.g. IntelliJ :63342). */
const CC_API_ORIGIN = import.meta.env.DEV
  ? "/api/cryptocompare"
  : "https://min-api.cryptocompare.com";

/**
 * Daily BTC/USD from CryptoCompare (no API key; CORS-friendly). Paginates backward from `toSec`.
 * Earliest usable daily closes depend on the feed; earlier days may be zero and are skipped.
 * @see https://min-api.cryptocompare.com/documentation?key=Historical&cat=dataHistoday
 */
async function fetchCryptoCompareHistodayRange({ fromSec, toSec, signal }) {
  const byTime = new Map();
  let toTs = toSec;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `${CC_API_ORIGIN}/data/v2/histoday?fsym=BTC&tsym=USD&limit=${CC_PAGE_LIMIT}&toTs=${toTs}`;
    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new Error(`CryptoCompare histoday failed (${res.status})`);
    }
    const json = await res.json();
    if (json.Response !== "Success" || !json.Data?.Data?.length) {
      break;
    }
    const arr = json.Data.Data;
    for (const row of arr) {
      if (row.close <= 0 || !Number.isFinite(row.close)) continue;
      if (row.time < fromSec || row.time > toSec) continue;
      byTime.set(row.time, row.close);
    }
    const oldest = arr[0].time;
    if (oldest <= fromSec) break;
    toTs = oldest - 86400;
    if (toTs < fromSec) break;
    if (page < MAX_PAGES - 1) {
      await new Promise((r) => setTimeout(r, BETWEEN_PAGES_MS));
    }
  }

  return [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([time, price]) => ({ timestampMs: time * 1000, price }));
}

/**
 * Optional: CoinGecko range when `VITE_COINGECKO_DEMO_API_KEY` is set (public demo plan uses header on api.coingecko.com).
 */
async function tryCoinGeckoMarketChartRange({ fromMs, toMs, signal }) {
  const key = import.meta.env?.VITE_COINGECKO_DEMO_API_KEY;
  if (!key) return null;
  const fromSec = Math.floor(fromMs / 1000);
  const toSec = Math.floor(toMs / 1000);
  const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${fromSec}&to=${toSec}`;
  const res = await fetch(url, {
    signal,
    headers: { "x-cg-demo-api-key": String(key) },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const prices = data?.prices;
  if (!Array.isArray(prices)) return null;
  const raw = prices
    .map(([timestampMs, price]) => ({
      timestampMs,
      price: typeof price === "number" && Number.isFinite(price) ? price : NaN,
    }))
    .filter((p) => Number.isFinite(p.price) && p.price > 0);
  return raw;
}

/**
 * Fetches BTC/USD daily history and returns monthly chart rows (fractional year + rounded nominal price).
 * Uses CryptoCompare by default (no key). If `VITE_COINGECKO_DEMO_API_KEY` is set, tries CoinGecko first.
 * @param {{ fromMs: number, toMs: number, signal?: AbortSignal }} opts
 * @returns {Promise<{ year: number, price: number }[]>}
 */
export async function fetchBtcUsdHistoryRange({ fromMs, toMs, signal }) {
  let raw = await tryCoinGeckoMarketChartRange({ fromMs, toMs, signal });
  if (!raw?.length) {
    const fromSec = Math.floor(fromMs / 1000);
    const toSec = Math.floor(toMs / 1000);
    raw = await fetchCryptoCompareHistodayRange({ fromSec, toSec, signal });
  }
  if (!raw.length) {
    throw new Error("No historical price data returned.");
  }

  const monthly = downsampleToMonthly(raw);
  return monthly.map((p) => ({
    year: parseFloat(fractionalYearFromUtcMs(p.timestampMs).toFixed(3)),
    /** Never 0: log-scale charts require strictly positive values (early BTC under $0.50 rounds to 0). */
    price: Math.max(0.01, Math.round(p.price)),
  }));
}
