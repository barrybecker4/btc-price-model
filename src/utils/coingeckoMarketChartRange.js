import { parsePositiveUsdNumber } from "./parseUsd.js";

/**
 * @param {[number, number]} tuple
 * @returns {{ timestampMs: number, price: number } | null}
 */
function mapTupleToPoint(tuple) {
  const timestampMs = tuple[0];
  const parsed = parsePositiveUsdNumber(tuple[1]);
  if (parsed === null) return null;
  return { timestampMs, price: parsed };
}

/**
 * CoinGecko `market_chart/range` when `VITE_COINGECKO_DEMO_API_KEY` is set.
 * Throws on HTTP failure when the key is present (no silent fallback).
 * @param {{ fromMs: number, toMs: number, signal?: AbortSignal }} params
 * @returns {Promise<{ timestampMs: number, price: number }[] | null>} null if no API key
 */
export async function fetchCoinGeckoMarketChartRange({ fromMs, toMs, signal }) {
  const apiKey = import.meta.env.VITE_COINGECKO_DEMO_API_KEY;
  if (!apiKey) return null;

  const fromSec = Math.floor(fromMs / 1000);
  const toSec = Math.floor(toMs / 1000);
  const base = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range";
  const query = "?vs_currency=usd&from=" + fromSec + "&to=" + toSec;
  const url = base + query;

  const res = await fetch(url, {
    signal,
    headers: { "x-cg-demo-api-key": String(apiKey) },
  });

  if (!res.ok) {
    throw new Error(`CoinGecko market_chart/range failed (${res.status})`);
  }

  const body = await res.json();
  const prices = body.prices;
  if (!Array.isArray(prices)) {
    throw new Error("CoinGecko market_chart/range returned no prices array.");
  }

  const mapped = prices.map(mapTupleToPoint).filter((point) => point !== null);
  return mapped;
}
