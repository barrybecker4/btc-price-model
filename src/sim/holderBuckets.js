import { MONTHS_PER_YEAR } from "./constants.js";

/** Minimum modeled liquid float (BTC) after rebalancing and holder flows. */
export const LIQ_FLOOR = 50000;

/** Initial liquid must be at least this after LTH/Ancient split (matches legacy single-pool floor scale). */
export const LIQ_MIN_INIT = 200000;

/**
 * Split available float (non-lost, non-treasury, non-ETF) into liquid vs nested LTH (young + ancient).
 * Clamps so ancient ≤ total LTH155 and liquid ≥ LIQ_MIN_INIT when possible.
 * @param {number} available0
 * @param {number} lth155SharePct
 * @param {number} ancientSharePct
 */
export function initialHolderSplit(available0, lth155SharePct, ancientSharePct) {
  const lPct = Math.max(60, Math.min(80, lth155SharePct)) / 100;
  const aPct = Math.max(15, Math.min(20, ancientSharePct)) / 100;
  let lth155Total = available0 * lPct;
  let ancientBtc = Math.min(available0 * aPct, lth155Total);
  let youngLth = lth155Total - ancientBtc;
  let liquid = available0 - lth155Total;

  if (liquid < LIQ_MIN_INIT && available0 > LIQ_MIN_INIT) {
    const shortfall = LIQ_MIN_INIT - liquid;
    lth155Total = Math.max(0, lth155Total - shortfall);
    ancientBtc = Math.min(ancientBtc, lth155Total);
    youngLth = lth155Total - ancientBtc;
    liquid = available0 - lth155Total;
  }

  return { liquid, youngLth, ancientBtc, lth155Total };
}

/**
 * Enforce a minimum liquid balance by moving BTC from young LTH, then ancient.
 * Preserves liquid + youngLth + ancientBtc (total modeled tradeable + illiquid float).
 * @param {number} liquid
 * @param {number} youngLth
 * @param {number} ancientBtc
 * @param {number} floor
 */
export function rebalanceLiquidToFloor(liquid, youngLth, ancientBtc, floor) {
  let L = liquid;
  let Y = youngLth;
  let A = ancientBtc;
  if (L >= floor) return { liquid: L, youngLth: Y, ancientBtc: A };
  let need = floor - L;
  const fromYoung = Math.min(need, Y);
  Y -= fromYoung;
  L += fromYoung;
  need = floor - L;
  if (need > 0) {
    const fromAncient = Math.min(need, A);
    A -= fromAncient;
    L += fromAncient;
  }
  return { liquid: L, youngLth: Y, ancientBtc: A };
}

/**
 * After demand step, apply signed annual flows toward buckets.
 * Positive rates: %/yr of **current liquid** L → young LTH or Ancient (scaled together so L ≥ LIQ_FLOOR).
 * Negative rates: %/yr of **source bucket** (young or ancient) → liquid (capped by bucket size).
 * Order: scale positive outflows so liquid stays ≥ LIQ_FLOOR; then negative inflows from young/ancient.
 * @param {number} liquid
 * @param {number} youngLth
 * @param {number} ancientBtc
 * @param {import("./simTypes.js").SimParams} p
 * @param {number} [price]
 */
export function applyHolderFlows(liquid, youngLth, ancientBtc, p, price = p.startPrice) {
  const rL = typeof p.flowLiquidToLth155Annual === "number" ? p.flowLiquidToLth155Annual : 0;
  const rA = typeof p.flowLiquidToAncientAnnual === "number" ? p.flowLiquidToAncientAnnual : 0;

  let L = liquid;
  let Y = youngLth;
  let A = ancientBtc;

  const mL = (rL / 100) * L / MONTHS_PER_YEAR;
  const mA = (rA / 100) * L / MONTHS_PER_YEAR;

  let outY = mL > 0 ? mL : 0;
  let outA = mA > 0 ? mA : 0;
  let room = Math.max(0, L - LIQ_FLOOR);
  const totalOut = outY + outA;
  if (totalOut > room && totalOut > 0) {
    const scale = room / totalOut;
    outY *= scale;
    outA *= scale;
  }
  L -= outY + outA;
  Y += outY;
  A += outA;

  if (rL < 0) {
    const tfr = Math.min(Y, (Math.abs(rL) / 100) * Y / MONTHS_PER_YEAR);
    Y -= tfr;
    L += tfr;
  }
  if (rA < 0) {
    const tfr = Math.min(A, (Math.abs(rA) / 100) * A / MONTHS_PER_YEAR);
    A -= tfr;
    L += tfr;
  }

  const distributionRate =
    typeof p.lthProfitDistributionAnnualPct === "number" ? Math.max(0, p.lthProfitDistributionAnnualPct) : 0;
  const startPrice = Math.max(1, p.startPrice ?? price ?? 1);
  const priceRatio = Math.max(0, (price ?? startPrice) / startPrice);
  const profitPressure = priceRatio <= 1 ? 0 : Math.min(2, Math.log(priceRatio) / Math.log(3));
  if (distributionRate > 0 && profitPressure > 0) {
    const monthlyRate = (distributionRate / 100 / MONTHS_PER_YEAR) * profitPressure;
    const fromYoung = Math.min(Y, Y * monthlyRate);
    const fromAncient = Math.min(A, A * monthlyRate);
    Y -= fromYoung;
    A -= fromAncient;
    L += fromYoung + fromAncient;
  }

  L = Math.max(L, LIQ_FLOOR);
  Y = Math.max(Y, 0);
  A = Math.max(A, 0);

  return { liquid: L, youngLth: Y, ancientBtc: A };
}
