import { describe, expect, it } from "vitest";
import {
  logReturnsFromCloses,
  trailingLogReturn,
  trailingRealizedVolAnnual,
} from "./dailyReturns.js";

describe("dailyReturns", () => {
  const points = [
    { timestampMs: 0, price: 100 },
    { timestampMs: 86400000, price: 102 },
    { timestampMs: 172800000, price: 101 },
    { timestampMs: 259200000, price: 105 },
  ];

  it("computes trailing log return", () => {
    expect(trailingLogReturn(points, 1)).toBeCloseTo(Math.log(105 / 101), 6);
  });

  it("annualizes realized vol from log returns", () => {
    const vol = trailingRealizedVolAnnual(points, 3);
    expect(vol).toBeGreaterThan(0);
    expect(vol).toBeLessThan(5);
  });

  it("builds log returns from closes", () => {
    const rets = logReturnsFromCloses(points);
    expect(rets).toHaveLength(3);
  });
});
