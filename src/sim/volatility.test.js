import { describe, expect, it } from "vitest";
import { MONTHS_PER_YEAR } from "./constants.js";
import {
  monthlySigmaFromAnnual,
  unitShockForMonth,
  volatilityTimeDecayMultiplier,
} from "./volatility.js";

describe("unitShockForMonth", () => {
  it("is deterministic and in roughly [-1, 1]", () => {
    const a = unitShockForMonth(0);
    const b = unitShockForMonth(0);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(-1);
    expect(a).toBeLessThanOrEqual(1);
  });

  it("differs across months", () => {
    expect(unitShockForMonth(1)).not.toBe(unitShockForMonth(2));
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
