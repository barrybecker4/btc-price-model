import { describe, expect, it } from "vitest";
import { buildForecastNarrative } from "./buildForecastNarrative.js";
import { buildHorizonPdf } from "../model/mixturePdf.js";

describe("buildForecastNarrative", () => {
  const features = {
    spotUsd: 100_000,
    rBtc1d: 0.01,
    rBtc7d: 0.04,
    rBtc30d: 0.1,
    volBtc7d: 0.5,
    volBtc30d: 0.65,
    rSpy1d: -0.02,
    rSpy7d: -0.04,
    volSpy30d: 0.2,
    fearGreed: 22,
    fearGreedDelta7d: -8,
    btcDominance: 58,
    dominanceDelta30d: 0,
    isFomcWeek: true,
    daysToDecision: 2,
    fedStance: "hawkish",
    expectedNextMove: "hold",
    degradedFeatures: ["spyDaily"],
    fetchedAtMs: Date.now(),
  };

  const h24 = buildHorizonPdf("24h", 24, { mu: 0, sigma: 0.02, mixtureActive: false }, 100_000);
  const h168 = buildHorizonPdf(
    "168h",
    168,
    {
      mu: 0.01,
      sigma: 0.05,
      mixtureActive: true,
      base: { mu: 0.01, sigma: 0.05, weight: 0.6 },
      stress: { mu: -0.005, sigma: 0.07, weight: 0.4 },
      stressWeight: 0.4,
    },
    100_000,
  );

  it("includes FOMC factor when in FOMC week", () => {
    const narrative = buildForecastNarrative(features, h168, h24);
    expect(narrative.factors.some((f) => f.id === "fomc")).toBe(true);
    expect(narrative.headline).toMatch(/7-day/i);
  });

  it("surfaces degraded warnings", () => {
    const narrative = buildForecastNarrative(features, h168, h24);
    expect(narrative.warnings.some((w) => w.includes("SPY"))).toBe(true);
  });
});
