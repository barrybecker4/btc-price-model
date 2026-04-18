import { describe, expect, it } from "vitest";
import { fractionalYearFromUtcMs, fractionalYearToMs } from "./powerLaw.js";

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
