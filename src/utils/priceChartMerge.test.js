import { describe, expect, it } from "vitest";
import {
  enrichHistoricalPriceRows,
  mergePriceChartHistoricalSim,
  priceRealForYear,
} from "./priceChartMerge.js";

describe("priceRealForYear", () => {
  it("matches sim anchor (year === yearStart → real === nominal)", () => {
    expect(priceRealForYear(100_000, 2026.0, 3, 2026.0)).toBe(100_000);
  });

  it("never returns 0 (log-scale safe)", () => {
    expect(priceRealForYear(0.01, 2011.0, 3, 2026.0)).toBeGreaterThanOrEqual(0.01);
  });
});

describe("enrichHistoricalPriceRows", () => {
  it("adds priceReal and zero unmetPremiumPct", () => {
    const rows = enrichHistoricalPriceRows([{ year: 2020, price: 10_000 }], 3, 2026);
    expect(rows).toHaveLength(1);
    expect(rows[0].price).toBe(10_000);
    expect(rows[0].priceReal).toBeGreaterThan(0);
    expect(rows[0].unmetPremiumPct).toBe(0);
  });
});

describe("mergePriceChartHistoricalSim", () => {
  it("concatenates historical before sim and orders by year", () => {
    const hist = [
      { year: 2011.5, price: 10, priceReal: 10 },
      { year: 2012.0, price: 12, priceReal: 12 },
    ];
    const sim = [
      { year: 2026.1, price: 50_000, priceReal: 48_000 },
      { year: 2027.0, price: 55_000, priceReal: 52_000 },
    ];
    const merged = mergePriceChartHistoricalSim(hist, sim, 2026.0);
    expect(merged).toHaveLength(4);
    expect(merged[0].year).toBeLessThan(merged[3].year);
  });

  it("drops last historical point when it matches first sim year within epsilon", () => {
    const yearStart = 2026.0;
    const hist = [{ year: yearStart - 6e-5, price: 1, priceReal: 1 }];
    const sim = [{ year: yearStart, price: 2, priceReal: 2 }];
    const merged = mergePriceChartHistoricalSim(hist, sim, yearStart);
    expect(merged).toHaveLength(1);
    expect(merged[0].price).toBe(2);
  });
});
