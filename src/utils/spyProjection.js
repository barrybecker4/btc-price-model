import spyMonthlyFallback from "../data/spyMonthlyFallback.json";
import { toRealDollarsAtAnchor } from "./cpiUs.js";

const SPY_HISTORICAL_YEARLY_CLOSES = [
  { year: 2011, price: 125.5 },
  { year: 2012, price: 142.4 },
  { year: 2013, price: 184.7 },
  { year: 2014, price: 205.5 },
  { year: 2015, price: 203.9 },
  { year: 2016, price: 224.4 },
  { year: 2017, price: 268.2 },
  { year: 2018, price: 249.9 },
  { year: 2019, price: 321.9 },
  { year: 2020, price: 373.9 },
  { year: 2021, price: 477.5 },
  { year: 2022, price: 384.3 },
  { year: 2023, price: 475.7 },
  { year: 2024, price: 543.0 },
  { year: 2025, price: 585.0 },
];

/** Tunable SPY overlay assumptions (see plan). */
export const MOMENTUM_WINDOW_YEARS = 5;
export const LOG_LINEAR_WINDOW_YEARS = 10;
export const DECAY_HALF_LIFE_YEARS = 7;
export const MOMENTUM_BLEND_WEIGHT = 0.5;
export const RETURN_CLAMP_MIN = 0;
export const RETURN_CLAMP_MAX = 0.25;
export const SPREAD_BASE = 0.03;
export const SPREAD_VOL_COEF = 0.5;
export const SPREAD_VOL_MAX = 0.04;
export const VOL_REF = 0.15;
export const VALUATION_PREMIUM_CAP = 0.06;
export const VALUATION_PREMIUM_COEF = 0.25;
export const VOL_WINDOW_MONTHS = 24;

const EARNINGS_COEFF = 0.65;
const DIVIDEND_YIELD = 0.015;
const BULL_BEAR_SPREAD_LEGACY = 0.02;
const YEAR_EPS = 1e-4;
const SPY_KEYS = ["spy", "spyReal"];

/**
 * @param {number} r
 */
function clampReturn(r) {
  return Math.min(RETURN_CLAMP_MAX, Math.max(RETURN_CLAMP_MIN, r));
}

/**
 * @param {{ year: number, price: number }[]} points
 * @param {number} anchorYear
 * @param {number} windowYears
 */
export function trailingCagr(points, anchorYear, windowYears = MOMENTUM_WINDOW_YEARS) {
  const sorted = [...points].sort((a, b) => a.year - b.year);
  const end = sorted.filter((p) => p.year <= anchorYear + YEAR_EPS).pop();
  if (!end || end.price <= 0) return null;
  const startYear = anchorYear - windowYears;
  const start = sorted.find((p) => p.year >= startYear - YEAR_EPS);
  if (!start || start.price <= 0 || start.year >= end.year) return null;
  const span = end.year - start.year;
  if (span <= 0) return null;
  return Math.pow(end.price / start.price, 1 / span) - 1;
}

/**
 * @param {{ year: number, price: number }[]} points
 * @param {number} anchorYear
 * @param {number} windowYears
 */
export function logLinearAnnualReturn(points, anchorYear, windowYears = LOG_LINEAR_WINDOW_YEARS) {
  const sorted = [...points]
    .filter((p) => p.year <= anchorYear + YEAR_EPS && p.year >= anchorYear - windowYears - YEAR_EPS && p.price > 0)
    .sort((a, b) => a.year - b.year);
  if (sorted.length < 2) return null;
  let n = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (const p of sorted) {
    const x = p.year;
    const y = Math.log(p.price);
    n++;
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumXY += x * y;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  return clampReturn(Math.exp(slope) - 1);
}

/**
 * @param {number|null} cagr
 * @param {number|null} logLinear
 * @param {number} [weight]
 */
export function blendMomentumReturn(cagr, logLinear, weight = MOMENTUM_BLEND_WEIGHT) {
  const parts = [];
  if (cagr != null && Number.isFinite(cagr)) parts.push({ r: cagr, w: weight });
  if (logLinear != null && Number.isFinite(logLinear)) parts.push({ r: logLinear, w: 1 - weight });
  if (!parts.length) return null;
  const totalW = parts.reduce((s, p) => s + p.w, 0);
  const blended = parts.reduce((s, p) => s + p.r * p.w, 0) / totalW;
  return clampReturn(blended);
}

/**
 * @param {{ year: number, price: number }[]} points
 * @param {number} anchorYear
 * @param {number} [windowMonths]
 */
export function annualizedRealizedVol(points, anchorYear, windowMonths = VOL_WINDOW_MONTHS) {
  const sorted = [...points]
    .filter((p) => p.year <= anchorYear + YEAR_EPS && p.price > 0)
    .sort((a, b) => a.year - b.year);
  if (sorted.length < 3) return 0;
  const monthSpan = windowMonths / 12;
  const windowed = sorted.filter((p) => p.year >= anchorYear - monthSpan - YEAR_EPS);
  const returns = [];
  for (let i = 1; i < windowed.length; i++) {
    const prev = windowed[i - 1].price;
    const curr = windowed[i].price;
    if (prev > 0 && curr > 0) returns.push(Math.log(curr / prev));
  }
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(Math.max(0, variance)) * Math.sqrt(12);
}

/**
 * @param {number} momentumReturn
 * @param {number} macroEarningsReturn
 */
export function valuationPremium(momentumReturn, macroEarningsReturn) {
  const raw = Math.max(0, momentumReturn - macroEarningsReturn);
  return Math.min(VALUATION_PREMIUM_CAP, raw);
}

/**
 * Instantaneous blend rate at deltaYears from anchor (starts at momentum, decays toward macro).
 */
export function decayBlendRate(deltaYears, rMacro, rMomentum, halfLifeYears = DECAY_HALF_LIFE_YEARS) {
  const tau = halfLifeYears / Math.LN2;
  return rMomentum + (rMacro - rMomentum) * (1 - Math.exp(-deltaYears / tau));
}

/**
 * ∫₀^Δ r(s) ds for momentum → macro decay.
 */
export function decayRateIntegral(deltaYears, rMacro, rMomentum, halfLifeYears = DECAY_HALF_LIFE_YEARS) {
  if (deltaYears <= 0) return 0;
  const tau = halfLifeYears / Math.LN2;
  const diff = rMacro - rMomentum;
  return rMomentum * deltaYears + diff * (deltaYears - tau * (1 - Math.exp(-deltaYears / tau)));
}

/**
 * @param {number} anchor
 * @param {number} deltaYears
 * @param {number} rMacro
 * @param {number} rMomentum
 * @param {number} [halfLifeYears]
 * @param {number} [spreadOffset] added to instantaneous rate (bull/bear)
 */
export function projectedPriceContinuous(
  anchor,
  deltaYears,
  rMacro,
  rMomentum,
  halfLifeYears = DECAY_HALF_LIFE_YEARS,
  spreadOffset = 0
) {
  if (deltaYears <= 0) return anchor;
  const integral = decayRateIntegral(deltaYears, rMacro, rMomentum, halfLifeYears);
  return anchor * Math.exp(integral + spreadOffset * deltaYears);
}

/**
 * @param {{ realizedVol: number, valuationPremium: number, bullishness: number }} input
 */
export function dynamicBullBearSpread({ realizedVol, valuationPremium: valPrem, bullishness }) {
  const volTerm = Math.min(SPREAD_VOL_MAX, SPREAD_VOL_COEF * (realizedVol / VOL_REF));
  const t = Math.min(1, Math.max(0, bullishness));
  const valTerm = VALUATION_PREMIUM_COEF * valPrem * t;
  return SPREAD_BASE + volTerm + valTerm;
}

/**
 * Spread offset for compounding: 0 at slider 0.5, +spread at 1, −spread at 0.
 */
export function bullishnessSpreadOffset(spread, spyBullishness) {
  const t = Math.min(1, Math.max(0, spyBullishness));
  return (2 * t - 1) * spread;
}

/**
 * @param {{ year: number, price: number }[]} points
 * @param {number} anchorYear
 */
export function resolveMomentumReturn(points, anchorYear) {
  const cagr = trailingCagr(points, anchorYear, MOMENTUM_WINDOW_YEARS);
  const logLin = logLinearAnnualReturn(points, anchorYear, LOG_LINEAR_WINDOW_YEARS);
  const blended = blendMomentumReturn(cagr, logLin, MOMENTUM_BLEND_WEIGHT);
  return blended ?? cagr ?? logLin ?? null;
}

/**
 * @param {number} yearStart
 * @param {{ year: number, price: number }[]|null|undefined} spyHistoricalPoints
 */
export function resolveSpyHistoricalPoints(spyHistoricalPoints, yearStart) {
  if (Array.isArray(spyHistoricalPoints) && spyHistoricalPoints.length >= 2) {
    return [...spyHistoricalPoints].sort((a, b) => a.year - b.year);
  }
  const fallback = spyMonthlyFallback.filter((p) => p.year <= yearStart + YEAR_EPS);
  if (fallback.length >= 2) return [...fallback].sort((a, b) => a.year - b.year);
  return SPY_HISTORICAL_YEARLY_CLOSES;
}

/**
 * Annual return for nominal SPY projection between bear (0) and bull (1) — legacy flat-rate helper.
 * @param {{ bearReturn: number, bullReturn: number }} rates
 * @param {number} spyBullishness 0–1
 */
export function spyNominalProjectedReturn(rates, spyBullishness) {
  const t = Math.min(1, Math.max(0, spyBullishness));
  return rates.bearReturn + t * (rates.bullReturn - rates.bearReturn);
}

/**
 * @param {number} year fractional year
 * @returns {number}
 */
export function spyPriceAtYear(year, historicalPoints = SPY_HISTORICAL_YEARLY_CLOSES) {
  const first = historicalPoints[0];
  const last = historicalPoints[historicalPoints.length - 1];
  if (year <= first.year) return first.price;
  if (year >= last.year) return last.price;

  for (let i = 0; i < historicalPoints.length - 1; i++) {
    const left = historicalPoints[i];
    const right = historicalPoints[i + 1];
    if (year >= left.year && year <= right.year) {
      const span = right.year - left.year;
      if (span <= 0) return left.price;
      const t = (year - left.year) / span;
      return left.price + (right.price - left.price) * t;
    }
  }
  return last.price;
}

/**
 * @param {number} inflationPct annual inflation (%)
 * @param {number} gdpGrowthPct annual nominal GDP growth (%), may include AI uplift
 */
export function spyScenarioRates(inflationPct, gdpGrowthPct) {
  const inflation = inflationPct / 100;
  const gdpGrowth = gdpGrowthPct / 100;
  const earningsGrowth = gdpGrowth * EARNINGS_COEFF;
  const nominalReturn = earningsGrowth + DIVIDEND_YIELD;
  const realReturn = nominalReturn - inflation;
  return {
    earningsGrowth,
    nominalReturn,
    realReturn,
    bullReturn: nominalReturn + BULL_BEAR_SPREAD_LEGACY,
    bearReturn: nominalReturn - BULL_BEAR_SPREAD_LEGACY,
  };
}

/**
 * Attach SPY historical/projection overlay fields to chart rows.
 * @param {object[]} rows
 * @param {{ yearStart: number, inflationPct: number, gdpGrowthPct: number, aiProductivityPct?: number, spyBullishness?: number, spyHistoricalPoints?: { year: number, price: number }[] }} input
 * @returns {object[]}
 */
export function attachSpyOverlay(rows, input) {
  const {
    yearStart,
    inflationPct,
    gdpGrowthPct,
    aiProductivityPct = 0,
    spyBullishness = 0.5,
    spyHistoricalPoints,
  } = input;
  const historicalPoints = resolveSpyHistoricalPoints(spyHistoricalPoints, yearStart);
  const statsPoints = historicalPoints;
  const effectiveGdpPct = gdpGrowthPct + (aiProductivityPct ?? 0);
  const rates = spyScenarioRates(inflationPct, effectiveGdpPct);
  const rMacro = rates.nominalReturn;
  const anchor = spyPriceAtYear(yearStart, historicalPoints);
  const inflation = inflationPct / 100;

  let rMomentum = resolveMomentumReturn(statsPoints, yearStart);
  if (rMomentum == null || !Number.isFinite(rMomentum)) {
    rMomentum = rMacro;
  }

  const vol = annualizedRealizedVol(statsPoints, yearStart);
  const valPrem = valuationPremium(rMomentum, rates.earningsGrowth);
  const spread = dynamicBullBearSpread({
    realizedVol: vol,
    valuationPremium: valPrem,
    bullishness: spyBullishness,
  });
  const spreadOffset = bullishnessSpreadOffset(spread, spyBullishness);

  return rows.map((row) => {
    const deltaYears = row.year - yearStart;
    if (deltaYears < 0) {
      const spy = spyPriceAtYear(row.year, historicalPoints);
      return { ...row, spy, spyReal: toRealDollarsAtAnchor(spy, row.year, yearStart) };
    }
    const spy = projectedPriceContinuous(anchor, deltaYears, rMacro, rMomentum, DECAY_HALF_LIFE_YEARS, spreadOffset);
    const nominalIntegral = decayRateIntegral(deltaYears, rMacro, rMomentum) + spreadOffset * deltaYears;
    const realIntegral = nominalIntegral - inflation * deltaYears;
    const spyReal = anchor * Math.exp(realIntegral);
    return { ...row, spy, spyReal };
  });
}

/**
 * Scale SPY chart fields so the first projected SPY point matches nominal BTC at the same row.
 * @param {object[]} rows
 * @param {number} yearStart fractional year where projection begins (same as attachSpyOverlay)
 * @returns {object[]}
 */
export function scaleSpyOverlayToBtcAtAnchor(rows, yearStart) {
  const anchorRow = rows.find(
    (row) => row.year >= yearStart - YEAR_EPS && Number(row.spy) > 0 && Number(row.price) > 0
  );
  if (!anchorRow) return rows;
  const scale = anchorRow.price / anchorRow.spy;
  if (!Number.isFinite(scale) || scale <= 0) return rows;

  return rows.map((row) => {
    let hasScaledKey = false;
    const scaledFields = {};
    for (const key of SPY_KEYS) {
      const value = row[key];
      if (value == null) continue;
      hasScaledKey = true;
      scaledFields[key] = value * scale;
    }
    return hasScaledKey ? { ...row, ...scaledFields } : row;
  });
}
