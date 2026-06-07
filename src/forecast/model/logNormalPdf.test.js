import { describe, expect, it } from "vitest";
import {
  buildLogNormalPdfGrid,
  integratePdf,
  normalizePdf,
  summarizePdf,
} from "./logNormalPdf.js";

describe("logNormalPdf", () => {
  const spot = 100_000;
  const mu = 0.01;
  const sigma = 0.03;

  it("normalized PDF integrates to ~1", () => {
    const grid = buildLogNormalPdfGrid(spot, mu, sigma, { gridPoints: 200, sigmaSpan: 4 });
    const normalized = normalizePdf(grid);
    const area = integratePdf(normalized);
    expect(area).toBeCloseTo(1, 2);
  });

  it("median is near S0 * exp(mu)", () => {
    const grid = normalizePdf(buildLogNormalPdfGrid(spot, mu, sigma));
    const { median } = summarizePdf(grid, spot);
    const expected = spot * Math.exp(mu);
    expect(Math.abs(median - expected) / expected).toBeLessThan(0.001);
  });
});
