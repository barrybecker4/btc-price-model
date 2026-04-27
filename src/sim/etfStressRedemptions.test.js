import { describe, expect, it } from "vitest";
import {
  getEtfStressRedemptionCount,
  getEtfStressRedemptionMonths,
  getEtfStressRedemptionYears,
} from "./etfStressRedemptions.js";

describe("getEtfStressRedemptionCount", () => {
  it("clamps event count to 0–3", () => {
    expect(getEtfStressRedemptionCount(-1)).toBe(0);
    expect(getEtfStressRedemptionCount(2.6)).toBe(3);
    expect(getEtfStressRedemptionCount(99)).toBe(3);
  });
});

describe("getEtfStressRedemptionMonths", () => {
  it("returns no events when count is zero", () => {
    expect(getEtfStressRedemptionMonths(120, 0)).toEqual([]);
  });

  it("spaces events through the simulation", () => {
    expect(getEtfStressRedemptionMonths(120, 1)).toEqual([60]);
    expect(getEtfStressRedemptionMonths(120, 2)).toEqual([40, 80]);
    expect(getEtfStressRedemptionMonths(120, 3)).toEqual([30, 60, 90]);
  });
});

describe("getEtfStressRedemptionYears", () => {
  it("converts event months to fractional years", () => {
    expect(getEtfStressRedemptionYears(2026, 10, 2)).toEqual([2026 + 40 / 12, 2026 + 80 / 12]);
  });
});
