import { describe, expect, it } from "vitest";
import { buildFeatureVector } from "../features/buildFeatureVector.js";
import { estimateDistributionParams } from "../model/estimateDistributionParams.js";

/** @returns {import("../forecastTypes.js").FeatureVector} */
function baseFeatures(overrides = {}) {
  return {
    spotUsd: 100_000,
    rBtc1d: 0.01,
    rBtc7d: 0.04,
    rBtc30d: 0.1,
    volBtc7d: 0.5,
    volBtc30d: 0.65,
    rSpy1d: 0.005,
    rSpy7d: 0.02,
    volSpy30d: 0.15,
    fearGreed: 55,
    fearGreedDelta7d: 5,
    btcDominance: 58,
    dominanceDelta30d: 0.01,
    isFomcWeek: false,
    daysToDecision: 14,
    fedStance: "neutral",
    expectedNextMove: "hold",
    degradedFeatures: [],
    fetchedAtMs: Date.now(),
    ...overrides,
  };
}

describe("estimateDistributionParams", () => {
  it("widens sigma in degraded mode", () => {
    const normal = estimateDistributionParams(
      baseFeatures({ volBtc30d: 0.45 }),
      "24h",
    );
    const degraded = estimateDistributionParams(
      baseFeatures({ volBtc30d: 0.45, degradedFeatures: ["btcDaily"] }),
      "24h",
    );
    expect(degraded.sigma).toBeGreaterThanOrEqual(normal.sigma);
    expect(degraded.sigma).toBeGreaterThan(0.014);
  });

  it("activates mixture on stress signals (not FOMC alone)", () => {
    const fomcOnly = estimateDistributionParams(
      baseFeatures({ isFomcWeek: true, daysToDecision: 1 }),
      "168h",
    );
    expect(fomcOnly.mixtureActive).toBe(false);

    const stress = estimateDistributionParams(
      baseFeatures({ fearGreed: 18, rSpy7d: -0.05 }),
      "168h",
    );
    expect(stress.mixtureActive).toBe(true);
    expect(stress.stressWeight).toBeGreaterThan(0);
  });

  it("buildFeatureVector maps bundle fields", () => {
    const fv = buildFeatureVector({
      spotUsd: 50_000,
      btcDaily: [
        { timestampMs: 0, price: 48_000 },
        { timestampMs: 86400000, price: 49_000 },
        { timestampMs: 8 * 86400000, price: 50_000 },
      ],
      spyDaily: [{ timestampMs: 0, price: 5000 }, { timestampMs: 86400000, price: 5100 }],
      fearGreed: [{ timestampMs: Date.now(), value: 40, classification: "Fear" }],
      globalCrypto: { btcDominancePct: 57, marketCapChangePct24h: -1 },
      fomc: {
        isFomcWeek: false,
        daysToNextDecision: 10,
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
    });
    expect(fv.spotUsd).toBe(50_000);
    expect(fv.fearGreed).toBe(40);
    expect(fv.btcDominance).toBe(57);
  });
});
