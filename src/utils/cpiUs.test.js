import { describe, expect, it } from "vitest";
import { cpiForFractionalYear, toRealDollarsAtAnchor } from "./cpiUs.js";

describe("cpiForFractionalYear", () => {
  it("returns annual values at exact years", () => {
    expect(cpiForFractionalYear(2011)).toBeCloseTo(224.939, 8);
  });

  it("linearly interpolates between years", () => {
    expect(cpiForFractionalYear(2011.5)).toBeCloseTo((224.939 + 229.594) / 2, 8);
  });

  it("clamps outside available range", () => {
    expect(cpiForFractionalYear(2005)).toBeCloseTo(218.056, 8);
    expect(cpiForFractionalYear(2099)).toBeCloseTo(330.0, 8);
  });
});

describe("toRealDollarsAtAnchor", () => {
  it("is identity at the same year", () => {
    expect(toRealDollarsAtAnchor(50_000, 2026, 2026)).toBe(50_000);
  });

  it("uses CPI ratio for historical inflation adjustment", () => {
    expect(toRealDollarsAtAnchor(10_000, 2020, 2026)).toBe(12_751);
  });

  it("keeps a positive floor for log scale safety", () => {
    expect(toRealDollarsAtAnchor(0, 2020, 2026)).toBe(0.01);
  });
});
