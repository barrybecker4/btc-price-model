import { integratePdf, normalizePdf } from "../model/logNormalPdf.js";

/**
 * Linearly interpolate PDF density at an arbitrary price.
 * @param {number} price
 * @param {import("../forecastTypes.js").PdfPoint[]} pdf
 * @returns {number}
 */
export function densityAtPrice(price, pdf) {
  if (!pdf.length) return 0;
  const sorted = [...pdf].sort((a, b) => a.price - b.price);
  if (price <= sorted[0].price) return sorted[0].density;
  if (price >= sorted[sorted.length - 1].price) return sorted[sorted.length - 1].density;
  for (let i = 1; i < sorted.length; i++) {
    const lo = sorted[i - 1];
    const hi = sorted[i];
    if (price >= lo.price && price <= hi.price) {
      const t = (price - lo.price) / (hi.price - lo.price || 1);
      return lo.density + t * (hi.density - lo.density);
    }
  }
  return 0;
}

/**
 * @param {import("../forecastTypes.js").PdfPoint[]} pdf
 * @returns {{ midPrice: number, mass: number }[]}
 */
export function pdfSlices(pdf) {
  const norm = normalizePdf(pdf);
  if (norm.length < 2) return [];
  /** @type {{ midPrice: number, mass: number }[]} */
  const slices = [];
  for (let i = 1; i < norm.length; i++) {
    const dx = norm[i].price - norm[i - 1].price;
    const mass = 0.5 * (norm[i].density + norm[i - 1].density) * dx;
    if (mass <= 0) continue;
    slices.push({
      midPrice: 0.5 * (norm[i].price + norm[i - 1].price),
      mass,
    });
  }
  return slices;
}

/**
 * Continuous Ranked Probability Score from a discrete PDF grid.
 * CRPS(F, y) ≈ E|X - y| - 0.5 E|X - X'| using trapezoidal mass on the grid.
 * @param {number} realized
 * @param {import("../forecastTypes.js").PdfPoint[]} pdf
 * @returns {number}
 */
export function crpsFromPdf(realized, pdf) {
  const slices = pdfSlices(pdf);
  if (!slices.length) return NaN;

  let expectedAbs = 0;
  let pairwise = 0;
  for (const a of slices) {
    expectedAbs += a.mass * Math.abs(a.midPrice - realized);
    for (const b of slices) {
      pairwise += a.mass * b.mass * Math.abs(a.midPrice - b.midPrice);
    }
  }
  return expectedAbs - 0.5 * pairwise;
}

/**
 * Negative log predictive density at the realized price.
 * @param {number} realized
 * @param {import("../forecastTypes.js").PdfPoint[]} pdf
 * @returns {number}
 */
export function logScoreFromPdf(realized, pdf) {
  const norm = normalizePdf(pdf);
  const density = densityAtPrice(realized, norm);
  return -Math.log(Math.max(density, 1e-300));
}

/**
 * Mean absolute percentage error of forecast median vs realized.
 * @param {number} forecastMedian
 * @param {number} realized
 * @returns {number}
 */
export function medianAbsPctError(forecastMedian, realized) {
  if (!Number.isFinite(realized) || realized <= 0) return NaN;
  return Math.abs(forecastMedian - realized) / realized;
}

/**
 * @param {number[]} values
 * @returns {number}
 */
export function mean(values) {
  const finite = values.filter((v) => Number.isFinite(v));
  if (!finite.length) return NaN;
  return finite.reduce((a, b) => a + b, 0) / finite.length;
}

/**
 * Bin rows by predicted P(up) deciles and compare to realized up frequency.
 * @param {{ predictedProbUp: number, realizedUp: boolean }[]} rows
 * @returns {{ bins: { decile: number, count: number, predictedMean: number, realizedUpRate: number }[], brierScore: number }}
 */
export function calibrationBins(rows) {
  if (!rows.length) {
    return { bins: [], brierScore: NaN };
  }

  /** @type {{ decile: number, count: number, predictedMean: number, realizedUpRate: number }[]} */
  const bins = [];
  for (let d = 0; d < 10; d++) {
    const lo = d / 10;
    const hi = (d + 1) / 10;
    const inBin =
      d < 9
        ? rows.filter((r) => r.predictedProbUp >= lo && r.predictedProbUp < hi)
        : rows.filter((r) => r.predictedProbUp >= lo && r.predictedProbUp <= hi);
    if (!inBin.length) {
      bins.push({ decile: d + 1, count: 0, predictedMean: NaN, realizedUpRate: NaN });
      continue;
    }
    bins.push({
      decile: d + 1,
      count: inBin.length,
      predictedMean: mean(inBin.map((r) => r.predictedProbUp)),
      realizedUpRate: mean(inBin.map((r) => (r.realizedUp ? 1 : 0))),
    });
  }

  let brier = 0;
  for (const row of rows) {
    const o = row.realizedUp ? 1 : 0;
    brier += (row.predictedProbUp - o) ** 2;
  }
  brier /= rows.length;

  return { bins, brierScore: brier };
}

/**
 * @param {number[]} crpsValues
 * @param {number[]} logScores
 * @param {number[]} medianMapes
 * @param {{ predictedProbUp: number, realizedUp: boolean }[]} calibrationRows
 * @returns {import("./walkForward.js").HorizonMetricSummary}
 */
export function summarizeHorizonMetrics(crpsValues, logScores, medianMapes, calibrationRows) {
  return {
    crps: mean(crpsValues),
    logScore: mean(logScores),
    medianMape: mean(medianMapes),
    sampleCount: crpsValues.length,
    calibration: calibrationBins(calibrationRows),
  };
}

/**
 * @param {import("../forecastTypes.js").PdfPoint[]} pdf
 * @returns {number}
 */
export function assertPdfIntegratesToOne(pdf) {
  return integratePdf(normalizePdf(pdf));
}
