import { describe, expect, it } from "vitest";
import { decimalYearToDate, fmtUSD, formatSimRangeLabel } from "./format.js";

describe("fmtUSD", () => {
  it("returns em dash for non-finite values", () => {
    expect(fmtUSD(NaN)).toBe("—");
    expect(fmtUSD(Infinity)).toBe("—");
  });

  it("formats magnitude buckets", () => {
    expect(fmtUSD(500)).toMatch(/^\$/);
    expect(fmtUSD(12_345)).toBe("$12K");
    expect(fmtUSD(2.5e6)).toBe("$2.50M");
    expect(fmtUSD(3.1e9)).toBe("$3.10B");
    expect(fmtUSD(4.2e12)).toBe("$4.20T");
    expect(fmtUSD(9.9e15)).toBe("$9.90Q");
  });

  it("formats very large quadrillions as integer thousands of Q", () => {
    const s = fmtUSD(1.234e19);
    expect(s).toContain("Q");
    expect(s).toMatch(/\$12,/);
  });
});

describe("decimalYearToDate", () => {
  it("maps Jan 1 local to start of year", () => {
    const d = decimalYearToDate(2020);
    expect(d.getFullYear()).toBe(2020);
    expect(d.getMonth()).toBe(0);
  });
});

describe("formatSimRangeLabel", () => {
  it("returns a range string with an en dash", () => {
    const label = formatSimRangeLabel(2025.0, 1);
    expect(label).toContain("–");
  });
});
