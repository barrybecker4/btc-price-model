import { describe, expect, it } from "vitest";
import { downsampleToMonthly } from "./fetchBtcHistory.js";

describe("downsampleToMonthly", () => {
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
});
