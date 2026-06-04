import { describe, expect, it } from "vitest";
import {
  START_PRICE_SLIDER_BASE_MAX,
  START_PRICE_SLIDER_BASE_MIN,
  boundsForSpotPrice,
  miningCostFloorBounds,
} from "./startPriceSlider.js";

describe("boundsForSpotPrice", () => {
  it("snaps value to step and clamps inside min/max", () => {
    const { min, max, value } = boundsForSpotPrice(87_654);
    expect(min).toBeLessThanOrEqual(START_PRICE_SLIDER_BASE_MIN);
    expect(max).toBeGreaterThanOrEqual(START_PRICE_SLIDER_BASE_MAX);
    expect(value % 1000).toBe(0);
    expect(value).toBeGreaterThanOrEqual(min);
    expect(value).toBeLessThanOrEqual(max);
  });

  it("expands max when spot exceeds base max", () => {
    const { max } = boundsForSpotPrice(400_000);
    expect(max).toBeGreaterThanOrEqual(400_000);
  });
});

describe("miningCostFloorBounds", () => {
  it("returns min at least MINING_COST_FLOOR_STEP and max at least 2× spot", () => {
    const { min, max } = miningCostFloorBounds(90_000);
    expect(min).toBeGreaterThanOrEqual(1000);
    expect(max).toBeGreaterThanOrEqual(90_000 * 2);
  });
});
