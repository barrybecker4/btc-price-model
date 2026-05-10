import { describe, expect, it } from "vitest";
import { parsePositiveUsdNumber } from "./parseUsd.js";

describe("parsePositiveUsdNumber", () => {
  it("returns finite positive numbers", () => {
    expect(parsePositiveUsdNumber(42)).toBe(42);
    expect(parsePositiveUsdNumber("99.5")).toBe(99.5);
  });

  it("returns null for non-positive or non-finite values", () => {
    expect(parsePositiveUsdNumber(0)).toBe(null);
    expect(parsePositiveUsdNumber(-1)).toBe(null);
    expect(parsePositiveUsdNumber(NaN)).toBe(null);
    expect(parsePositiveUsdNumber(Infinity)).toBe(null);
    expect(parsePositiveUsdNumber("")).toBe(null);
  });
});
