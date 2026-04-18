const CC_PAGE_LIMIT = 2000;
const MAX_PAGES = 24;
const BETWEEN_PAGES_MS = 120;

/** In `vite dev`, requests use the same-origin proxy in vite.config.js (avoids CORS on non‑Vite localhost ports, e.g. IntelliJ :63342). */
function cryptoCompareApiOrigin() {
  const isDev = import.meta.env.DEV;
  if (isDev) return "/api/cryptocompare";
  return "https://min-api.cryptocompare.com";
}

function buildHistodayUrl(toTs) {
  const origin = cryptoCompareApiOrigin();
  const query =
    "/data/v2/histoday?fsym=BTC&tsym=USD&limit=" + CC_PAGE_LIMIT + "&toTs=" + toTs;
  return origin + query;
}

function extractHistodayRows(json) {
  if (json.Response !== "Success") return null;
  const payload = json.Data;
  if (!payload) return null;
  const rows = payload.Data;
  if (!rows) return null;
  if (!rows.length) return null;
  return rows;
}

function mergeHistodayRow(byTime, row, fromSec, toSec) {
  const close = row.close;
  if (close <= 0) return;
  if (!Number.isFinite(close)) return;
  const time = row.time;
  if (time < fromSec) return;
  if (time > toSec) return;
  byTime.set(time, close);
}

function sleepBetweenPages(page) {
  if (page >= MAX_PAGES - 1) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, BETWEEN_PAGES_MS));
}

function mapToPricePoints(byTime) {
  const entries = [...byTime.entries()];
  entries.sort((a, b) => a[0] - b[0]);
  return entries.map(([time, price]) => ({
    timestampMs: time * 1000,
    price,
  }));
}

/**
 * Daily BTC/USD from CryptoCompare (no API key; CORS-friendly). Paginates backward from `toSec`.
 * @see https://min-api.cryptocompare.com/documentation?key=Historical&cat=dataHistoday
 * @param {{ fromSec: number, toSec: number, signal?: AbortSignal }} params
 * @returns {Promise<{ timestampMs: number, price: number }[]>}
 */
export async function fetchCryptoCompareHistodayRange({ fromSec, toSec, signal }) {
  const byTime = new Map();
  let toTs = toSec;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = buildHistodayUrl(toTs);
    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new Error(`CryptoCompare histoday failed (${res.status})`);
    }
    const json = await res.json();
    const arr = extractHistodayRows(json);
    if (!arr) break;

    for (const row of arr) {
      mergeHistodayRow(byTime, row, fromSec, toSec);
    }

    const oldest = arr[0].time;
    if (oldest <= fromSec) break;
    toTs = oldest - 86400;
    if (toTs < fromSec) break;
    await sleepBetweenPages(page);
  }

  return mapToPricePoints(byTime);
}
