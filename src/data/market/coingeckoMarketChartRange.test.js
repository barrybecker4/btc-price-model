import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCoinGeckoMarketChartRange } from "./coingeckoMarketChartRange.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchCoinGeckoMarketChartRange", () => {
  it("returns null when API key is not set", async () => {
    vi.stubEnv("VITE_COINGECKO_DEMO_API_KEY", "");
    const out = await fetchCoinGeckoMarketChartRange({
      fromMs: 0,
      toMs: 1,
      signal: undefined,
    });
    expect(out).toBeNull();
  });

  it("throws on non-ok response when API key is set", async () => {
    vi.stubEnv("VITE_COINGECKO_DEMO_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
      })),
    );
    await expect(
      fetchCoinGeckoMarketChartRange({ fromMs: 0, toMs: 1e12, signal: undefined }),
    ).rejects.toThrow("401");
  });

  it("returns parsed points on success", async () => {
    vi.stubEnv("VITE_COINGECKO_DEMO_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          prices: [
            [1_000_000, 50_000],
            [2_000_000, 51_000],
          ],
        }),
      })),
    );
    const out = await fetchCoinGeckoMarketChartRange({
      fromMs: 0,
      toMs: 1e12,
      signal: undefined,
    });
    expect(out).toEqual([
      { timestampMs: 1_000_000, price: 50_000 },
      { timestampMs: 2_000_000, price: 51_000 },
    ]);
  });

  it("throws when prices array is missing", async () => {
    vi.stubEnv("VITE_COINGECKO_DEMO_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({}),
      })),
    );
    await expect(
      fetchCoinGeckoMarketChartRange({ fromMs: 0, toMs: 1e12, signal: undefined }),
    ).rejects.toThrow("no prices array");
  });
});
