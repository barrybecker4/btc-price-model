/**
 * Same “real price” convention as {@link runSim}: deflated to simulation anchor year.
 * @param {number} priceNominal
 * @param {number} year fractional calendar year
 * @param {number} inflationPct annual inflation (%)
 * @param {number} yearStart simulation anchor (fractional year)
 */
export function priceRealForYear(priceNominal, year, inflationPct, yearStart) {
  const r = inflationPct / 100;
  const v = Math.round(priceNominal / Math.pow(1 + r, year - yearStart));
  /** Match nominal: avoid 0 so log-scale Y axis can render (Recharts rejects non-positive values). */
  return Math.max(0.01, v);
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
 * @param {object[]} historical enriched rows strictly before yearStart
 * @param {object[]} simRows simulation chart rows (downsampled)
 * @param {number} yearStart
 * @returns {object[]}
 */
export function mergePriceChartHistoricalSim(historical, simRows, yearStart) {
  const hist = historical.filter((r) => r.year < yearStart - YEAR_EPS);
  const lastH = hist[hist.length - 1];
  const firstS = simRows[0];
  let head = hist;
  if (lastH && firstS && Math.abs(lastH.year - firstS.year) < YEAR_EPS) {
    head = hist.slice(0, -1);
  }
  return [...head, ...simRows];
}
