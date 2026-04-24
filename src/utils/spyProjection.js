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

const EARNINGS_COEFF = 0.65;
const DIVIDEND_YIELD = 0.015;
const BULL_BEAR_SPREAD = 0.02;
const YEAR_EPS = 1e-4;
const SPY_KEYS = ["spy", "spyReal"];

/**
 * Annual return for nominal SPY projection between bear (0) and bull (1).
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
export function spyPriceAtYear(year) {
  const first = SPY_HISTORICAL_YEARLY_CLOSES[0];
  const last = SPY_HISTORICAL_YEARLY_CLOSES[SPY_HISTORICAL_YEARLY_CLOSES.length - 1];
  if (year <= first.year) return first.price;
  if (year >= last.year) return last.price;

  for (let i = 0; i < SPY_HISTORICAL_YEARLY_CLOSES.length - 1; i++) {
    const left = SPY_HISTORICAL_YEARLY_CLOSES[i];
    const right = SPY_HISTORICAL_YEARLY_CLOSES[i + 1];
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
 * @param {number} gdpGrowthPct annual nominal GDP growth (%)
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
    bullReturn: nominalReturn + BULL_BEAR_SPREAD,
    bearReturn: nominalReturn - BULL_BEAR_SPREAD,
  };
}

/**
 * Attach SPY historical/projection overlay fields to chart rows.
 * @param {object[]} rows
 * @param {{ yearStart: number, inflationPct: number, gdpGrowthPct: number, spyBullishness?: number }} input
 * @returns {object[]}
 */
export function attachSpyOverlay(rows, input) {
  const { yearStart, inflationPct, gdpGrowthPct, spyBullishness = 0.5 } = input;
  const rates = spyScenarioRates(inflationPct, gdpGrowthPct);
  const anchor = spyPriceAtYear(yearStart);
  const nominalR = spyNominalProjectedReturn(rates, spyBullishness);

  return rows.map((row) => {
    const deltaYears = row.year - yearStart;
    if (deltaYears < -YEAR_EPS) {
      return { ...row, spy: spyPriceAtYear(row.year) };
    }
    return {
      ...row,
      spy: anchor * Math.pow(1 + nominalR, deltaYears),
      spyReal: anchor * Math.pow(1 + rates.realReturn, deltaYears),
    };
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
