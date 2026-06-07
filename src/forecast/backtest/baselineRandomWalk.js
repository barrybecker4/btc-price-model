import { trailingRealizedVolAnnual } from "../features/dailyReturns.js";
import { buildLogNormalPdfGrid, normalizePdf, summarizePdf } from "../model/logNormalPdf.js";
import { coefficients } from "../model/estimateDistributionParams.js";

/**
 * Historical-vol random walk baseline: mu=0, sigma from trailing 30d BTC vol.
 * @param {import("../forecastTypes.js").DailyClosePoint[]} btcThroughAsOf
 * @param {number} spotUsd
 * @param {'24h' | '168h'} horizonKey
 * @returns {import("../forecastTypes.js").HorizonPdf}
 */
export function buildBaselineRandomWalkPdf(btcThroughAsOf, spotUsd, horizonKey) {
  const vol30 = Math.max(0.05, trailingRealizedVolAnnual(btcThroughAsOf, 30));
  const dailySigma = vol30 / Math.sqrt(252);
  const horizonDays = horizonKey === "24h" ? 1 : 7;
  const sigma = dailySigma * Math.sqrt(horizonDays);
  const mu = 0;

  const gridOpts = {
    gridPoints: coefficients.pdf.gridPoints,
    sigmaSpan: coefficients.pdf.sigmaSpan,
  };
  const pdf = normalizePdf(buildLogNormalPdfGrid(spotUsd, mu, sigma, gridOpts));
  const summary = summarizePdf(pdf, spotUsd);

  return {
    horizon: horizonKey,
    horizonHours: horizonKey === "24h" ? 24 : 168,
    pdf,
    spotUsd,
    mixtureActive: false,
    ...summary,
  };
}
