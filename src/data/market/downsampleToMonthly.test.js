import { describe, expect, it } from "vitest";
import { downsampleToMonthly } from "./downsampleToMonthly.js";

describe("downsampleToMonthly", () => {
  it("returns empty array for empty input", () => {
    expect(downsampleToMonthly([])).toEqual([]);
  });

  it("keeps one point per UTC month (last daily sample wins)", () => {
    const points = [
      { timestampMs: Date.UTC(2011, 0, 5), price: 1 },
      { timestampMs: Date.UTC(2011, 0, 20), price: 2 },
      { timestampMs: Date.UTC(2011, 1, 3), price: 3 },
    ];
    const out = downsampleToMonthly(points);
    expect(out).toHaveLength(2);
    expect(out[0].price).toBe(2);
    expect(out[1].price).toBe(3);
  });

  it("sorts unsorted input by timestamp", () => {
    const points = [
      { timestampMs: Date.UTC(2012, 2, 1), price: 30 },
      { timestampMs: Date.UTC(2012, 0, 1), price: 10 },
    ];
    const out = downsampleToMonthly(points);
    expect(out[0].price).toBe(10);
    expect(out[1].price).toBe(30);
  });
});
