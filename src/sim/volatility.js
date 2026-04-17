import { MONTHS_PER_YEAR } from "./constants.js";

/**
 * Deterministic pseudo-random shock in roughly [-1, 1] for month index `m`.
 * Same inputs always yield the same value (reproducible charts; no Math.random).
 */
export function unitShockForMonth(m) {
  const x = Math.sin(m * 12.9898 + 78.233) * 43758.5453123;
  const u = x - Math.floor(x);
  return u * 2 - 1;
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
