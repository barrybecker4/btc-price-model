import { toRealDollarsAtAnchor } from "./cpiUs.js";

/**
 * @param {{ year: number, price: number }[]} rawHistorical from API (nominal only)
 * @param {number} yearStart
 * @returns {object[]}
 */
export function enrichHistoricalPriceRows(rawHistorical, yearStart) {
  return rawHistorical.map((row) => ({
    year: row.year,
    price: row.price,
    priceReal: toRealDollarsAtAnchor(row.price, row.year, yearStart),
    unmetPremiumPct: 0,
  }));
}

const YEAR_EPS = 1e-4;

/**
 * @param {object[]} rowsBeforeSim historical enriched rows strictly before yearStart
 * @param {object[]} simRows
 * @returns {object[]}
 */
function trimDuplicateBoundaryPoint(rowsBeforeSim, simRows) {
  const lastHistorical = rowsBeforeSim[rowsBeforeSim.length - 1];
  const firstSim = simRows[0];
  if (!lastHistorical) return rowsBeforeSim;
  if (!firstSim) return rowsBeforeSim;
  const yearGap = Math.abs(lastHistorical.year - firstSim.year);
  if (yearGap >= YEAR_EPS) return rowsBeforeSim;
  return rowsBeforeSim.slice(0, -1);
}

/**
 * @param {object[]} historical enriched rows strictly before yearStart
 * @param {object[]} simRows simulation chart rows (downsampled)
 * @param {number} yearStart
 * @returns {object[]}
 */
export function mergePriceChartHistoricalSim(historical, simRows, yearStart) {
  const beforeStart = historical.filter((row) => row.year < yearStart - YEAR_EPS);
  const head = trimDuplicateBoundaryPoint(beforeStart, simRows);
  return [...head, ...simRows];
}
