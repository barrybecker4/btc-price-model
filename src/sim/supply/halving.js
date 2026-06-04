/** Next protocol halving after a fixed calendar anchor (sim uses fractional years from “today”; lines still use integer halving years). */
export const FIRST_HALVING_YEAR = 2028;

export const HALVING_INTERVAL_YEARS = 4;

/**
 * At cycle strength = 1 (slider max), peak extra monthly return during the bull leg
 * of the 4y wave (asymmetric vs bust — per historical BTC cycles).
 */
export const HALVING_BOOM_AT_FULL = 0.062;

/**
 * At cycle strength = 1, peak extra monthly drag during the bear leg (much larger than boom).
 * Tuned so that at slider max, a mature bull peak in the full model retraces ~70% peak-to-trough.
 * When price is already near `miningCostFloor`, realized DD from a small local top is capped by the
 * floor (often ~58–60% from typical starting prices).
 */
export const HALVING_BUST_AT_FULL = 0.262;

/**
 * Approximate Bitcoin halving dates as fractional calendar years (block-time schedule).
 * Used for chart reference lines; future epochs extend every ~4y from the last historical halving.
 */
export const HALVING_CHART_EPOCHS = [
  2012.91, // 2012-11-28
  2016.52, // 2016-07-09
  2020.36, // 2020-05-11
  2024.3, // 2024-04-20
];

function extendHalvingEpochsUntil(endYear) {
  const epochs = [...HALVING_CHART_EPOCHS];
  let next = HALVING_CHART_EPOCHS[HALVING_CHART_EPOCHS.length - 1] + HALVING_INTERVAL_YEARS;
  while (next <= endYear + 1e-9) {
    epochs.push(next);
    next += HALVING_INTERVAL_YEARS;
  }
  return epochs;
}

/** Halving epochs in (startYear, endYear] — chart reference lines. */
export function getHalvingYearsBetween(startYear, endYear) {
  const epochs = extendHalvingEpochsUntil(endYear);
  return epochs.filter((y) => y > startYear && y <= endYear);
}

/** Halving epochs that fall inside (simStart, simStart + simYears] — all that intersect the chart x-range. */
export function getHalvingYearsInRange(simStartYear, simYears) {
  return getHalvingYearsBetween(simStartYear, simStartYear + simYears);
}

/**
 * Extra monthly price return from a stylized 4y boom/bust (halving cadence).
 * `strength` is 0–1 (slider): 0 = off, 1 = full historical-style asymmetry (~70% peak-to-trough
 * from a major bull high when price clears the mining floor by a wide margin).
 * Amplitude is scaled by decay^halvingIndex so later cycles can be weaker.
 */
export function getHalvingCycleMonthlyAdj(year, strength, impactDecay) {
  const s = typeof strength === "number" && Number.isFinite(strength) ? strength : 0;
  if (s <= 0) return 0;
  const strengthClamped = Math.max(0, Math.min(1, s));
  const d =
    impactDecay == null || !Number.isFinite(impactDecay) ? 1 : Math.max(0, Math.min(1, impactDecay));
  const frac = year - FIRST_HALVING_YEAR;
  const halvingIndex = frac >= 0 ? Math.floor(frac / HALVING_INTERVAL_YEARS) : 0;
  const u = ((frac % HALVING_INTERVAL_YEARS) + HALVING_INTERVAL_YEARS) % HALVING_INTERVAL_YEARS;
  const theta = (u / HALVING_INTERVAL_YEARS) * 2 * Math.PI;
  const sinT = Math.sin(theta);
  const boom = Math.max(0, sinT);
  const bust = Math.max(0, -sinT);
  const decay = Math.pow(d, halvingIndex);
  const scale = strengthClamped * decay;
  return scale * (HALVING_BOOM_AT_FULL * boom - HALVING_BUST_AT_FULL * bust);
}
