import { describe, expect, it } from "vitest";
import { DEFAULT_TAPER_YEARS } from "./constants.js";
import { effectiveAnnualGrowthTapered, logisticWeight01 } from "./growthTaper.js";

describe("logisticWeight01", () => {
  it("maps endpoints: w(0) > w(1) for positive steepness", () => {
    const k = 12;
    const w0 = logisticWeight01(0, k);
    const w1 = logisticWeight01(1, k);
    expect(w0).toBeGreaterThan(w1);
    expect(w0).toBeGreaterThan(0.5);
    expect(w1).toBeLessThan(0.5);
  });

  it("clamps u outside [0,1]", () => {
    const k = 12;
    expect(logisticWeight01(-1, k)).toBe(logisticWeight01(0, k));
    expect(logisticWeight01(2, k)).toBe(logisticWeight01(1, k));
  });
});

describe("effectiveAnnualGrowthTapered", () => {
  it("returns r0 when nYears < 1 or t <= 0", () => {
    expect(
      effectiveAnnualGrowthTapered({
        r0: 10,
        rInf: 4,
        tYears: 0,
        nYears: 12,
      })
    ).toBe(10);
    expect(
      effectiveAnnualGrowthTapered({
        r0: 10,
        rInf: 4,
        tYears: 5,
        nYears: 0.5,
      })
    ).toBe(10);
  });

  it("returns rInf at or beyond the taper horizon", () => {
    expect(
      effectiveAnnualGrowthTapered({
        r0: 10,
        rInf: 4,
        tYears: 12,
        nYears: 12,
      })
    ).toBe(4);
    expect(
      effectiveAnnualGrowthTapered({
        r0: 10,
        rInf: 4,
        tYears: 20,
        nYears: 12,
      })
    ).toBe(4);
  });

  it("interpolates between r0 and rInf inside the horizon", () => {
    const mid = effectiveAnnualGrowthTapered({
      r0: 10,
      rInf: 4,
      tYears: 6,
      nYears: 12,
    });
    expect(mid).toBeGreaterThan(4);
    expect(mid).toBeLessThan(10);
  });

  it("uses explicit steepness when provided (away from u=0.5 where w is always 0.5)", () => {
    const a = effectiveAnnualGrowthTapered({
      r0: 10,
      rInf: 4,
      tYears: 3,
      nYears: DEFAULT_TAPER_YEARS,
      steepness: 100,
    });
    const b = effectiveAnnualGrowthTapered({
      r0: 10,
      rInf: 4,
      tYears: 3,
      nYears: DEFAULT_TAPER_YEARS,
      steepness: 1,
    });
    expect(a).not.toBe(b);
  });
});
