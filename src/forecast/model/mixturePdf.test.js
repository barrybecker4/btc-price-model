import { describe, expect, it } from "vitest";
import { buildMixtureLogNormalPdf } from "./mixturePdf.js";
import { integratePdf, summarizePdf } from "./logNormalPdf.js";

describe("mixturePdf", () => {
  const spot = 90_000;

  it("mixture PDF integrates to ~1", () => {
    const params = {
      mu: 0.005,
      sigma: 0.025,
      mixtureActive: true,
      base: { mu: 0.005, sigma: 0.025, weight: 0.65 },
      stress: { mu: -0.01, sigma: 0.04, weight: 0.35 },
      stressWeight: 0.35,
    };
    const pdf = buildMixtureLogNormalPdf(params, spot);
    expect(integratePdf(pdf)).toBeCloseTo(1, 2);
  });

  it("stress component shifts median lower", () => {
    const baseOnly = buildMixtureLogNormalPdf(
      { mu: 0, sigma: 0.02, mixtureActive: false },
      spot,
    );
    const mixed = buildMixtureLogNormalPdf(
      {
        mu: 0,
        sigma: 0.02,
        mixtureActive: true,
        base: { mu: 0, sigma: 0.02, weight: 0.5 },
        stress: { mu: -0.05, sigma: 0.04, weight: 0.5 },
        stressWeight: 0.5,
      },
      spot,
    );
    const baseMedian = summarizePdf(baseOnly, spot).median;
    const mixedMedian = summarizePdf(mixed, spot).median;
    expect(mixedMedian).toBeLessThan(baseMedian);
  });
});
