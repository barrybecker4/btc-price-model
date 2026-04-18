/**
 * Same “real price” convention as {@link runSim}: deflated to simulation anchor year.
 * @param {number} priceNominal
 * @param {number} year fractional calendar year
 * @param {number} inflationPct annual inflation (%)
 * @param {number} yearStart simulation anchor (fractional year)
 */
export function priceRealForYear(priceNominal, year, inflationPct, yearStart) {
  const inflationRate = inflationPct / 100;
  const deflated = Math.round(
    priceNominal / Math.pow(1 + inflationRate, year - yearStart),
  );
  /** Match nominal: avoid 0 so log-scale Y axis can render (Recharts rejects non-positive values). */
  return Math.max(0.01, deflated);
}

/**
 * @param {{ year: number, price: number }[]} rawHistorical from API (nominal only)
 * @param {number} inflationPct
 * @param {number} yearStart
 * @returns {object[]}
 */
export function enrichHistoricalPriceRows(rawHistorical, inflationPct, yearStart) {
  return rawHistorical.map((row) => ({
    year: row.year,
    price: row.price,
    priceReal: priceRealForYear(row.price, row.year, inflationPct, yearStart),
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
