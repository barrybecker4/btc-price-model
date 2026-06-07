import {
  daysSinceGenesis,
  powerLawBoundsUsd,
  powerLawTrendUsd,
} from "../../reference/powerLaw.js";
import { YEAR_START } from "../../sim/config/constants.js";

/**
 * Linear interpolate sim nominal price at fractional year.
 * @param {{ year: number, price: number }[]} rows
 * @param {number} targetYear
 * @returns {number | null}
 */
export function interpolateSimPriceAtYear(rows, targetYear) {
  if (!rows?.length) return null;
  const sorted = [...rows].sort((a, b) => a.year - b.year);
  if (targetYear <= sorted[0].year) return sorted[0].price;
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (targetYear >= a.year && targetYear <= b.year) {
      const t = (targetYear - a.year) / (b.year - a.year || 1);
      return a.price + t * (b.price - a.price);
    }
  }
  return sorted[sorted.length - 1].price;
}

/**
 * @param {import("../forecastTypes.js").SimContext | null | undefined} simContext
 * @param {import("../forecastTypes.js").HorizonPdf} horizon168h
 * @returns {import("../forecastTypes.js").ContextRibbonPoint | null}
 */
export function buildContextRibbon(simContext, horizon168h) {
  if (!simContext?.simRows?.length) return null;

  const yearStart = simContext.yearStart ?? YEAR_START;
  const targetYear = yearStart + 7 / 365;
  const simPrice7d = interpolateSimPriceAtYear(simContext.simRows, targetYear);
  if (simPrice7d == null) return null;

  const days = daysSinceGenesis(targetYear);
  const trend = powerLawTrendUsd(days);
  const bounds = powerLawBoundsUsd(days);

  return {
    simPrice7d,
    powerLawTrend: trend,
    powerLawLower: bounds.lower,
    powerLawUpper: bounds.upper,
    forecastMedian168h: horizon168h.median,
  };
}
