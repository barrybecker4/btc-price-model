import { MONTHS_PER_YEAR } from "./constants.js";

/** Deterministic uniform in [0, 1) from seed + key (xorshift/mix). */
export function seededUnitRandom(seed, key) {
  let x = ((seed | 0) ^ (key | 0)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x / 4294967296;
}

/** Deterministic standard-normal shock from seed + key using Box-Muller transform. */
export function seededStandardNormal(seed, key) {
  const u1 = Math.max(Number.MIN_VALUE, seededUnitRandom(seed, key * 2 + 1013904223));
  const u2 = seededUnitRandom(seed, key * 2 + 362437);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Deterministic clamped shock from seed + key for bounded single-month impact. */
export function seededClampedNormal(seed, key, maxAbs = 2.5) {
  const limit = Math.max(0, maxAbs);
  return Math.max(-limit, Math.min(limit, seededStandardNormal(seed, key)));
}

/**
 * Monthly return noise scale from annualized volatility (fraction, e.g. 0.73 for 73%).
 * Uses σ_month ≈ σ_annual / √MONTHS_PER_YEAR (log-return style scaling).
 */
export function monthlySigmaFromAnnual(annualFraction) {
  if (!Number.isFinite(annualFraction) || annualFraction <= 0) return 0;
  return annualFraction / Math.sqrt(MONTHS_PER_YEAR);
}

/**
 * Linear fade of volatility over the simulation: 1 at start → (1 − reduction) at end.
 * @param {number} reductionFraction — 0–1, fraction of initial vol removed by the final month
 * @param {number} m — current month index (0 … months-1) for transition m → m+1
 * @param {number} months — total simulated months (simYears * 12)
 */
export function volatilityTimeDecayMultiplier(reductionFraction, m, months) {
  const r =
    typeof reductionFraction === "number" && Number.isFinite(reductionFraction)
      ? Math.max(0, Math.min(1, reductionFraction))
      : 0;
  const denom = Math.max(months, 1);
  const t = m / denom;
  return 1 - r * t;
}
