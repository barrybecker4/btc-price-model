import { describe, expect, it } from "vitest";
import { buildLogNormalPdfGrid, normalizePdf } from "../model/logNormalPdf.js";
import {
  assertPdfIntegratesToOne,
  calibrationBins,
  crpsFromPdf,
  densityAtPrice,
  logScoreFromPdf,
  medianAbsPctError,
} from "./metrics.js";

describe("backtest metrics", () => {
  const spot = 100_000;
  const pdf = normalizePdf(buildLogNormalPdfGrid(spot, 0.01, 0.03, { gridPoints: 100, sigmaSpan: 4 }));

  it("PDF integrates to ~1", () => {
    expect(assertPdfIntegratesToOne(pdf)).toBeCloseTo(1, 2);
  });

  it("computes density at price via interpolation", () => {
    const d = densityAtPrice(spot, pdf);
    expect(d).toBeGreaterThan(0);
  });

  it("log score is finite at realized price near spot", () => {
    const score = logScoreFromPdf(spot * 1.01, pdf);
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThan(0);
  });

  it("CRPS is lower when forecast centers on realized value", () => {
    const realized = spot * 1.02;
    const good = normalizePdf(buildLogNormalPdfGrid(spot, Math.log(realized / spot), 0.02));
    const bad = normalizePdf(buildLogNormalPdfGrid(spot, 0, 0.08));
    expect(crpsFromPdf(realized, good)).toBeLessThan(crpsFromPdf(realized, bad));
  });

  it("medianAbsPctError measures relative error", () => {
    expect(medianAbsPctError(102_000, 100_000)).toBeCloseTo(0.02, 4);
  });

  it("calibration bins compute Brier score", () => {
    const rows = [
      { predictedProbUp: 0.8, realizedUp: true },
      { predictedProbUp: 0.7, realizedUp: false },
      { predictedProbUp: 0.2, realizedUp: false },
      { predictedProbUp: 0.3, realizedUp: true },
    ];
    const { bins, brierScore } = calibrationBins(rows);
    expect(bins.length).toBe(10);
    expect(brierScore).toBeGreaterThan(0);
    expect(brierScore).toBeLessThan(1);
  });
});
