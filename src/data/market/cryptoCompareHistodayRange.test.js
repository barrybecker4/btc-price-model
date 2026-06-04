import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCryptoCompareHistodayRange } from "./cryptoCompareHistodayRange.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("fetchCryptoCompareHistodayRange", () => {
  it("throws when HTTP response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 503,
        json: async () => ({}),
      })),
    );
    await expect(
      fetchCryptoCompareHistodayRange({ fromSec: 1, toSec: 2, signal: undefined }),
    ).rejects.toThrow("503");
  });

  it("returns merged price points for a successful page", async () => {
    const timeSec = 1_600_000_000;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          Response: "Success",
          Data: { Data: [{ time: timeSec, close: 42_000 }] },
        }),
      })),
    );
    const out = await fetchCryptoCompareHistodayRange({
      fromSec: timeSec - 5,
      toSec: timeSec + 5,
      signal: undefined,
    });
    expect(out).toEqual([{ timestampMs: timeSec * 1000, price: 42_000 }]);
  });
});
