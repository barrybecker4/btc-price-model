import { describe, expect, it } from "vitest";
import { attachSpyOverlay, spyPriceAtYear, spyScenarioRates } from "./spyProjection.js";

describe("spyPriceAtYear", () => {
  it("linearly interpolates between yearly closes", () => {
    const midpoint = spyPriceAtYear(2011.5);
    expect(midpoint).toBeCloseTo((125.5 + 142.4) / 2, 8);
  });
});

describe("spyScenarioRates", () => {
  it("matches reference return assumptions", () => {
    const rates = spyScenarioRates(3, 5);
    expect(rates.earningsGrowth).toBeCloseTo(0.0325, 8);
    expect(rates.nominalReturn).toBeCloseTo(0.0475, 8);
    expect(rates.realReturn).toBeCloseTo(0.0175, 8);
    expect(rates.bullReturn).toBeCloseTo(0.0675, 8);
    expect(rates.bearReturn).toBeCloseTo(0.0275, 8);
  });
});

describe("attachSpyOverlay", () => {
  it("uses historical before anchor and scenarios at/after anchor", () => {
    const yearStart = 2025.25;
    const rows = [{ year: 2025.0 }, { year: 2025.25 }, { year: 2025.75 }];
    const out = attachSpyOverlay(rows, { yearStart, inflationPct: 3, gdpGrowthPct: 5 });
    const anchor = spyPriceAtYear(yearStart);

    expect(out[0].spyHistorical).toBeCloseTo(585, 8);
    expect(out[0].spyBase).toBeUndefined();

    expect(out[1].spyHistorical).toBeUndefined();
    expect(out[1].spyBase).toBeCloseTo(anchor, 8);
    expect(out[1].spyBull).toBeCloseTo(anchor, 8);
    expect(out[1].spyBear).toBeCloseTo(anchor, 8);
    expect(out[1].spyReal).toBeCloseTo(anchor, 8);

    expect(out[2].spyBull).toBeGreaterThan(out[2].spyBase);
    expect(out[2].spyBase).toBeGreaterThan(out[2].spyBear);
  });
});
