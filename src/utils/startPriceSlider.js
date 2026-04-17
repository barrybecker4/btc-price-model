export const START_PRICE_SLIDER_BASE_MIN = 50000;
export const START_PRICE_SLIDER_BASE_MAX = 250000;
export const START_PRICE_SLIDER_STEP = 1000;

export const MINING_COST_FLOOR_STEP = 1000;

/** Slider range: one-third of spot to 2× spot (aligned to MINING_COST_FLOOR_STEP). */
export function miningCostFloorBounds(startPrice) {
  return {
    min: Math.max(
      MINING_COST_FLOOR_STEP,
      Math.floor(startPrice / 3 / MINING_COST_FLOOR_STEP) * MINING_COST_FLOOR_STEP
    ),
    max: Math.ceil((startPrice * 2) / MINING_COST_FLOOR_STEP) * MINING_COST_FLOOR_STEP,
  };
}

/**
 * @param {number} spotUsd - raw spot from API
 * @returns {{ min: number; max: number; value: number }}
 */
export function boundsForSpotPrice(spotUsd) {
  const STEP = START_PRICE_SLIDER_STEP;
  const snapped = Math.round(spotUsd / STEP) * STEP;
  const min = Math.min(START_PRICE_SLIDER_BASE_MIN, Math.floor(spotUsd / STEP) * STEP);
  const max = Math.max(START_PRICE_SLIDER_BASE_MAX, Math.ceil(spotUsd / STEP) * STEP);
  const value = Math.min(max, Math.max(min, snapped));
  return { min, max, value };
}
