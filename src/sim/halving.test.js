import { describe, expect, it } from "vitest";
import {
  FIRST_HALVING_YEAR,
  HALVING_INTERVAL_YEARS,
  getHalvingCycleMonthlyAdj,
  getHalvingYearsBetween,
  getHalvingYearsInRange,
  HALVING_CHART_EPOCHS,
} from "./halving.js";

describe("getHalvingCycleMonthlyAdj", () => {
  it("returns 0 when strength is 0 or non-finite", () => {
    expect(getHalvingCycleMonthlyAdj(2030, 0, 1)).toBe(0);
    expect(getHalvingCycleMonthlyAdj(2030, -1, 1)).toBe(0);
    expect(getHalvingCycleMonthlyAdj(2030, NaN, 1)).toBe(0);
  });

  it("is periodic in HALVING_INTERVAL_YEARS (same phase offset)", () => {
    const y0 = FIRST_HALVING_YEAR + 0.25;
    const y1 = y0 + HALVING_INTERVAL_YEARS;
    const a = getHalvingCycleMonthlyAdj(y0, 1, 1);
    const b = getHalvingCycleMonthlyAdj(y1, 1, 1);
    expect(a).toBeCloseTo(b, 10);
  });

  it("weakens later cycles when impactDecay < 1", () => {
    const early = getHalvingCycleMonthlyAdj(FIRST_HALVING_YEAR + 0.1, 1, 0.5);
    const later = getHalvingCycleMonthlyAdj(
      FIRST_HALVING_YEAR + HALVING_INTERVAL_YEARS * 3 + 0.1,
      1,
      0.5
    );
    expect(Math.abs(later)).toBeLessThan(Math.abs(early));
  });

  it("boom and bust legs have opposite sign at quarter-phase offsets", () => {
    const boomT = FIRST_HALVING_YEAR + HALVING_INTERVAL_YEARS * 0.25;
    const bustT = FIRST_HALVING_YEAR + HALVING_INTERVAL_YEARS * 0.75;
    const boom = getHalvingCycleMonthlyAdj(boomT, 1, 1);
    const bust = getHalvingCycleMonthlyAdj(bustT, 1, 1);
    expect(boom).toBeGreaterThan(0);
    expect(bust).toBeLessThan(0);
  });
});

describe("getHalvingYearsInRange", () => {
  it("includes future epochs up to sim end and excludes simStartYear", () => {
    const lastHistorical = HALVING_CHART_EPOCHS[HALVING_CHART_EPOCHS.length - 1];
    const start = lastHistorical - 0.5;
    const years = 6;
    const inRange = getHalvingYearsInRange(start, years);
    expect(inRange.length).toBeGreaterThan(0);
    expect(inRange.every((y) => y > start && y <= start + years)).toBe(true);
  });
});

describe("getHalvingYearsBetween", () => {
  it("includes known epochs after 2011 through end year", () => {
    const between = getHalvingYearsBetween(2011, 2030);
    expect(between.some((y) => Math.abs(y - 2012.91) < 0.01)).toBe(true);
    expect(between.every((y) => y > 2011 && y <= 2030)).toBe(true);
  });

  it("matches getHalvingYearsInRange for the same window", () => {
    const start = 2025.0;
    const years = 8;
    expect(getHalvingYearsBetween(start, start + years)).toEqual(getHalvingYearsInRange(start, years));
  });
});
