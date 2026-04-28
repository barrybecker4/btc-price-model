import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetSpyHistoryCacheForTests, fetchSpyMonthlyHistory } from "./fetchSpyMonthlyHistory.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  __resetSpyHistoryCacheForTests();
});

describe("fetchSpyMonthlyHistory", () => {
  it("merges cached 2011-2026 bulk with fresh recent tail", async () => {
    const csvBulk = [
      "Date,SP500",
      "2011-01-01,1271.87",
      "2011-01-31,1286.12",
      "2026-12-01,7100.00",
      "2026-12-31,7120.00",
      "2027-01-01,7150.00",
      "2027-01-31,7160.00",
      "2027-02-01,7188.00",
      "2027-02-28,7201.00",
    ].join("\n");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () => csvBulk,
      })),
    );

    const rows = await fetchSpyMonthlyHistory({
      fromMs: Date.UTC(2026, 11, 1),
      toMs: Date.UTC(2027, 1, 1),
      signal: undefined,
    });

    const dec2026 = rows.find((row) => row.year > 2026.9 && row.year < 2026.93);
    const jan2027 = rows.find((row) => Math.abs(row.year - 2027.0) < 1e-3);
    const feb2027 = rows.find((row) => row.year > 2027.07 && row.year < 2027.09);
    expect(dec2026?.price).toBe(7120);
    expect(jan2027?.price).toBe(7160);
    expect(feb2027?.price).toBe(7188);
  });

  it("falls back to static monthly data when runtime fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 })));
    const rows = await fetchSpyMonthlyHistory({
      fromMs: Date.UTC(2011, 0, 1),
      toMs: Date.UTC(2011, 2, 1),
      signal: undefined,
    });
    expect(rows).toHaveLength(3);
    expect(rows[0].price).toBeGreaterThan(0);
  });
});
