import { buildContextRibbon } from "./context/buildContextRibbon.js";
import { fetchForecastFeatureBundle } from "./data/fetchForecastFeatureBundle.js";
import { buildFeatureVector } from "./features/buildFeatureVector.js";
import { getFedPolicySnapshot } from "./macro/fomcContext.js";
import { estimateDistributionParams } from "./model/estimateDistributionParams.js";
import { buildHorizonPdf } from "./model/mixturePdf.js";
import { buildForecastNarrative } from "./narrative/buildForecastNarrative.js";

/**
 * @param {{ signal?: AbortSignal, simContext?: import("./forecastTypes.js").SimContext | null, includeContextRibbon?: boolean, bypassCache?: boolean }} [opts]
 * @returns {Promise<import("./forecastTypes.js").ForecastResult>}
 */
export async function runForecast(opts = {}) {
  const bundle = await fetchForecastFeatureBundle({
    signal: opts.signal,
    bypassCache: opts.bypassCache,
  });

  if (bundle.spotUsd == null || bundle.spotUsd <= 0) {
    throw new Error("Forecast requires a valid BTC spot price.");
  }

  const features = buildFeatureVector(bundle);
  const params24 = estimateDistributionParams(features, "24h");
  const params168 = estimateDistributionParams(features, "168h");

  const horizon24h = buildHorizonPdf("24h", 24, params24, bundle.spotUsd);
  const horizon168h = buildHorizonPdf("168h", 168, params168, bundle.spotUsd);

  const narrative = buildForecastNarrative(features, horizon168h, horizon24h);
  const contextRibbon =
    opts.includeContextRibbon && opts.simContext
      ? buildContextRibbon(opts.simContext, horizon168h)
      : null;

  return {
    spotUsd: bundle.spotUsd,
    generatedAtMs: bundle.fetchedAtMs,
    features,
    horizon24h,
    horizon168h,
    narrative,
    contextRibbon,
    fedPolicy: getFedPolicySnapshot(),
  };
}
