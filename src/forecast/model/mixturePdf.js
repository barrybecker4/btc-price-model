import { coefficients } from "./estimateDistributionParams.js";
import {
  buildLogNormalPdfGrid,
  normalizePdf,
  summarizePdf,
} from "./logNormalPdf.js";

/**
 * @param {import("../forecastTypes.js").HorizonDistributionParams} params
 * @param {number} spotUsd
 * @returns {import("../forecastTypes.js").PdfPoint[]}
 */
export function buildMixtureLogNormalPdf(params, spotUsd) {
  const gridOpts = {
    gridPoints: coefficients.pdf.gridPoints,
    sigmaSpan: coefficients.pdf.sigmaSpan,
  };

  if (!params.mixtureActive || !params.base || !params.stress) {
    const grid = buildLogNormalPdfGrid(spotUsd, params.mu, params.sigma, gridOpts);
    return normalizePdf(grid);
  }

  const wBase = params.base.weight ?? 1 - (params.stressWeight ?? 0.35);
  const wStress = params.stress.weight ?? params.stressWeight ?? 0.35;
  const baseGrid = buildLogNormalPdfGrid(spotUsd, params.base.mu, params.base.sigma, gridOpts);
  const stressGrid = buildLogNormalPdfGrid(spotUsd, params.stress.mu, params.stress.sigma, gridOpts);

  /** @type {import("../forecastTypes.js").PdfPoint[]} */
  const mixed = baseGrid.map((point, i) => ({
    price: point.price,
    density: wBase * point.density + wStress * stressGrid[i].density,
  }));

  return normalizePdf(mixed);
}

/**
 * @param {'24h' | '168h'} horizonKey
 * @param {number} horizonHours
 * @param {import("../forecastTypes.js").HorizonDistributionParams} params
 * @param {number} spotUsd
 * @returns {import("../forecastTypes.js").HorizonPdf}
 */
export function buildHorizonPdf(horizonKey, horizonHours, params, spotUsd) {
  const pdf = buildMixtureLogNormalPdf(params, spotUsd);
  const summary = summarizePdf(pdf, spotUsd);
  return {
    horizon: horizonKey,
    horizonHours,
    pdf,
    spotUsd,
    mixtureActive: params.mixtureActive,
    ...summary,
  };
}
