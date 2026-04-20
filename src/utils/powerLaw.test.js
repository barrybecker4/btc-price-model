import { describe, expect, it } from "vitest";
import { decimalYearToDate } from "./format.js";
import {
  GENESIS_MS,
  POWER_LAW_DAYS_EXPONENT,
  POWER_LAW_LOG10_INTERCEPT,
  SIGMA_LOG10,
  daysSinceGenesis,
  fractionalYearFromUtcMs,
  fractionalYearToLocalMs,
  fractionalYearToMs,
  powerLawBoundsUsd,
  powerLawTrendUsd,
} from "./powerLaw.js";

describe("fractionalYearFromUtcMs", () => {
  it("round-trips with fractionalYearToMs for mid-year instants", () => {
    const y = 2015.37;
    const ms = fractionalYearToMs(y);
    expect(fractionalYearFromUtcMs(ms)).toBeCloseTo(y, 5);
  });

  it("maps Jan 1 UTC to integer year", () => {
    const ms = Date.UTC(2010, 0, 1);
    expect(fractionalYearFromUtcMs(ms)).toBeCloseTo(2010, 6);
  });
});

describe("fractionalYearToLocalMs", () => {
  it("matches decimalYearToDate epoch for the same fractional year", () => {
    const fractionalYear = 2024.37;
    const fromDecimal = decimalYearToDate(fractionalYear).getTime();
    const fromLocalMs = fractionalYearToLocalMs(fractionalYear);
    expect(Math.abs(fromLocalMs - fromDecimal)).toBeLessThan(1);
  });
});

describe("daysSinceGenesis", () => {
  it("clamps to at least 1 day before genesis instant", () => {
    const early2009 = fractionalYearToMs(2009.0);
    expect(early2009).toBeLessThan(GENESIS_MS);
    expect(daysSinceGenesis(2009.0)).toBe(1);
  });
});

describe("powerLawTrendUsd", () => {
  it("matches reference formula at a fixed day count", () => {
    const days = 4000;
    const expected =
      Math.pow(10, POWER_LAW_LOG10_INTERCEPT) *
      Math.pow(days, POWER_LAW_DAYS_EXPONENT);
    expect(powerLawTrendUsd(days)).toBeCloseTo(expected, 8);
  });
});

describe("powerLawBoundsUsd", () => {
  it("scales trend by sigma in log space", () => {
    const days = 5000;
    const trend = powerLawTrendUsd(days);
    const bounds = powerLawBoundsUsd(days, SIGMA_LOG10);
    const factor = Math.pow(10, SIGMA_LOG10);
    expect(bounds.upper).toBeCloseTo(trend * factor, 8);
    expect(bounds.lower).toBeCloseTo(trend / factor, 8);
  });
});
