/**
 * Logistic taper: blend slider annual growth toward nominal GDP (rInf) over nYears.
 * r_eff = rInf + (r0 - rInf) * w(u), u = min(tYears / nYears, 1),
 * w(u) = 1 / (1 + exp(k * (u - 0.5))).
 */

import { DEFAULT_TAPER_YEARS } from "./constants.js";

/**
 * Logistic slope k in w(u)=1/(1+exp(k(u-0.5))). Independent of MONTHS_PER_YEAR (calendar);
 * not the same as DEFAULT_TAPER_YEARS (years); numerically 12 by tuning, not by identity.
 */
const BASE_LOGISTIC_STEEPNESS = 12;

/**
 * Returns 1 / (1 + exp(z)) for all finite z without clamping z (numerically stable).
 */
function invOnePlusExp(z) {
  if (z > 0) {
    const emz = Math.exp(-z);
    return emz / (1 + emz);
  }
  const ez = Math.exp(z);
  return 1 / (1 + ez);
}

/**
 * k scales with DEFAULT_TAPER_YEARS / nYears so shorter horizons get a sharper logistic
 * (more price/sim impact when N is reduced).
 */
function steepnessForHorizon(nYears) {
  return (BASE_LOGISTIC_STEEPNESS * DEFAULT_TAPER_YEARS) / Math.max(nYears, 1);
}

/**
 * @param {number} u normalized time in [0, 1]
 * @param {number} steepness logistic k
 */
export function logisticWeight01(u, steepness) {
  const uc = Math.min(Math.max(u, 0), 1);
  const z = steepness * (uc - 0.5);
  return invOnePlusExp(z);
}

/**
 * Effective annual growth % for this month after taper.
 * @param {object} opts
 * @param {number} opts.r0 slider annual % (e.g. strcGrowthRate)
 * @param {number} opts.rInf long-run anchor (nominal GDP %)
 * @param {number} opts.tYears years since sim start
 * @param {number} opts.nYears taper horizon (years); if &lt; 1, no taper (returns r0)
 * @param {number} [opts.steepness] optional override for k (testing); default scales with nYears
 */
export function effectiveAnnualGrowthTapered({ r0, rInf, tYears, nYears, steepness }) {
  const r0n = typeof r0 === "number" && Number.isFinite(r0) ? r0 : 0;
  const rInfN = typeof rInf === "number" && Number.isFinite(rInf) ? rInf : 0;

  if (!Number.isFinite(nYears) || nYears < 1) {
    return r0n;
  }

  const t = typeof tYears === "number" && Number.isFinite(tYears) ? Math.max(0, tYears) : 0;
  if (t <= 0) {
    return r0n;
  }
  if (t >= nYears) {
    return rInfN;
  }

  const u = Math.min(t / nYears, 1);
  const k =
    typeof steepness === "number" && Number.isFinite(steepness) ? steepness : steepnessForHorizon(nYears);
  const w = logisticWeight01(u, k);
  return rInfN + (r0n - rInfN) * w;
}
