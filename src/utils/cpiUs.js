export const US_CPI_U_ANNUAL = Object.freeze({
  2010: 218.056,
  2011: 224.939,
  2012: 229.594,
  2013: 232.957,
  2014: 236.736,
  2015: 237.017,
  2016: 240.007,
  2017: 245.12,
  2018: 251.107,
  2019: 255.657,
  2020: 258.811,
  2021: 270.97,
  2022: 292.655,
  2023: 305.349,
  2024: 315.0,
  2025: 322.0,
  2026: 330.0,
});

const CPI_YEARS = Object.keys(US_CPI_U_ANNUAL)
  .map((year) => Number(year))
  .sort((a, b) => a - b);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cpiForYear(year) {
  const cpi = US_CPI_U_ANNUAL[year];
  if (!Number.isFinite(cpi) || cpi <= 0) {
    throw new Error(`Invalid CPI value for year ${year}`);
  }
  return cpi;
}

/**
 * Annual CPI-U interpolation for fractional calendar years.
 * Clamps to edge years outside the available table.
 * @param {number} year
 * @returns {number}
 */
export function cpiForFractionalYear(year) {
  if (!Number.isFinite(year)) {
    throw new Error("CPI interpolation year must be finite.");
  }

  const firstYear = CPI_YEARS[0];
  const lastYear = CPI_YEARS[CPI_YEARS.length - 1];
  const clampedYear = clamp(year, firstYear, lastYear);
  const lowerYear = Math.floor(clampedYear);
  const upperYear = Math.ceil(clampedYear);

  if (lowerYear === upperYear) return cpiForYear(lowerYear);

  const lowerCpi = cpiForYear(lowerYear);
  const upperCpi = cpiForYear(upperYear);
  const t = (clampedYear - lowerYear) / (upperYear - lowerYear);
  return lowerCpi + (upperCpi - lowerCpi) * t;
}

/**
 * Convert nominal amount to anchor-year dollars using annual CPI-U ratios.
 * @param {number} amountNominal
 * @param {number} observationYear
 * @param {number} anchorYear
 * @returns {number}
 */
export function toRealDollarsAtAnchor(amountNominal, observationYear, anchorYear) {
  const observationCpi = cpiForFractionalYear(observationYear);
  const anchorCpi = cpiForFractionalYear(anchorYear);
  const adjusted = Math.round(amountNominal * (anchorCpi / observationCpi));
  return Math.max(0.01, adjusted);
}
