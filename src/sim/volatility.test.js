import { describe, expect, it } from "vitest";
import { MONTHS_PER_YEAR } from "./constants.js";
import {
  monthlySigmaFromAnnual,
  seededClampedNormal,
  seededStandardNormal,
  seededUnitRandom,
  volatilityTimeDecayMultiplier,
} from "./volatility.js";

describe("seededUnitRandom", () => {
  it("is deterministic for the same seed + key", () => {
    expect(seededUnitRandom(42, 7)).toBe(seededUnitRandom(42, 7));
    expect(seededUnitRandom(42, 7)).not.toBe(seededUnitRandom(42, 8));
  });
});

describe("seededStandardNormal", () => {
  it("returns finite deterministic shocks", () => {
    const a = seededStandardNormal(1234, 9);
    const b = seededStandardNormal(1234, 9);
    expect(Number.isFinite(a)).toBe(true);
    expect(a).toBe(b);
  });
});

describe("seededClampedNormal", () => {
  it("clamps deterministic shocks to the requested absolute limit", () => {
    for (let i = 0; i < 100; i += 1) {
      const shock = seededClampedNormal(555, i, 1.5);
      expect(shock).toBeGreaterThanOrEqual(-1.5);
      expect(shock).toBeLessThanOrEqual(1.5);
    }
  });
});

describe("monthlySigmaFromAnnual", () => {
  it("returns 0 for non-positive or non-finite annual fraction", () => {
    expect(monthlySigmaFromAnnual(0)).toBe(0);
    expect(monthlySigmaFromAnnual(-0.5)).toBe(0);
    expect(monthlySigmaFromAnnual(NaN)).toBe(0);
  });

  it("scales by 1/sqrt(12)", () => {
    const annual = 0.73;
    expect(monthlySigmaFromAnnual(annual)).toBeCloseTo(annual / Math.sqrt(MONTHS_PER_YEAR));
  });
});

describe("volatilityTimeDecayMultiplier", () => {
  it("is 1 at start and 1 - r at end when months > 0", () => {
    const months = 120;
    expect(volatilityTimeDecayMultiplier(0.9, 0, months)).toBe(1);
    expect(volatilityTimeDecayMultiplier(0.9, months, months)).toBeCloseTo(0.1);
  });

  it("clamps reduction fraction to [0, 1]", () => {
    expect(volatilityTimeDecayMultiplier(2, 60, 120)).toBe(volatilityTimeDecayMultiplier(1, 60, 120));
    expect(volatilityTimeDecayMultiplier(-1, 60, 120)).toBe(1);
  });
});
