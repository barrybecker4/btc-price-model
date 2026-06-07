import { describe, expect, it } from "vitest";
import { buildFeatureVector } from "./features/buildFeatureVector.js";
import { estimateDistributionParams } from "./model/estimateDistributionParams.js";
import { buildHorizonPdf } from "./model/mixturePdf.js";
import { buildForecastNarrative } from "./narrative/buildForecastNarrative.js";

describe("runForecast", () => {
  it("produces consistent result from feature bundle pipeline", () => {
    const bundle = {
      spotUsd: 100_000,
      btcDaily: Array.from({ length: 30 }, (_, i) => ({
        timestampMs: Date.now() - (29 - i) * 86400000,
        price: 95_000 + i * 200,
      })),
      spyDaily: Array.from({ length: 30 }, (_, i) => ({
        timestampMs: Date.now() - (29 - i) * 86400000,
        price: 5000 + i,
      })),
      fearGreed: [{ timestampMs: Date.now(), value: 50, classification: "Neutral" }],
      globalCrypto: { btcDominancePct: 57, marketCapChangePct24h: 0.5 },
      fomc: {
        isFomcWeek: false,
        daysToNextDecision: 20,
        nextDecisionDate: "2025-07-30",
        policy: {
          fundsRateLower: 4.25,
          fundsRateUpper: 4.5,
          stance: "neutral",
          expectedNextMove: "hold",
          lastUpdated: "2025-05-07",
        },
      },
      degradedFeatures: [],
      fetchedAtMs: Date.now(),
    };

    const features = buildFeatureVector(bundle);
    const params24 = estimateDistributionParams(features, "24h");
    const params168 = estimateDistributionParams(features, "168h");
    const horizon24h = buildHorizonPdf("24h", 24, params24, bundle.spotUsd);
    const horizon168h = buildHorizonPdf("168h", 168, params168, bundle.spotUsd);
    const narrative = buildForecastNarrative(features, horizon168h, horizon24h);

    expect(bundle.spotUsd).toBe(100_000);
    expect(horizon24h.horizon).toBe("24h");
    expect(horizon168h.horizonHours).toBe(168);
    expect(narrative.headline.length).toBeGreaterThan(10);
    expect(horizon24h.pdf.length).toBeGreaterThan(50);
  });
});
