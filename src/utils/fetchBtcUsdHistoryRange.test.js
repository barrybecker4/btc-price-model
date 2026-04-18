import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchBtcUsdHistoryRange } from "./fetchBtcUsdHistoryRange.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchBtcUsdHistoryRange", () => {
  it("maps CryptoCompare daily data to monthly chart rows when CoinGecko key is absent", async () => {
    vi.stubEnv("VITE_COINGECKO_DEMO_API_KEY", "");
    const timeSec = 1_600_000_000;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          Response: "Success",
          Data: { Data: [{ time: timeSec, close: 42_123.7 }] },
        }),
      })),
    );
    const rows = await fetchBtcUsdHistoryRange({
      fromMs: (timeSec - 10) * 1000,
      toMs: (timeSec + 10) * 1000,
      signal: undefined,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].price).toBe(42_124);
    expect(rows[0].year).toBeGreaterThan(2000);
  });
});
