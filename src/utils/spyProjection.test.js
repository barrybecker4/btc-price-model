import { describe, expect, it } from "vitest";
import {
  attachSpyOverlay,
  scaleSpyOverlayToBtcAtAnchor,
  spyNominalProjectedReturn,
  spyPriceAtYear,
  spyScenarioRates,
} from "./spyProjection.js";
import { toRealDollarsAtAnchor } from "./cpiUs.js";

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

describe("spyNominalProjectedReturn", () => {
  it("matches bear at 0 and bull at 1", () => {
    const rates = spyScenarioRates(3, 5);
    expect(spyNominalProjectedReturn(rates, 0)).toBeCloseTo(rates.bearReturn, 10);
    expect(spyNominalProjectedReturn(rates, 1)).toBeCloseTo(rates.bullReturn, 10);
    expect(spyNominalProjectedReturn(rates, 0.5)).toBeCloseTo(rates.nominalReturn, 10);
  });
});

describe("attachSpyOverlay", () => {
  it("uses historical before anchor and projection at/after anchor", () => {
    const yearStart = 2025.25;
    const rows = [{ year: 2025.0 }, { year: 2025.25 }, { year: 2025.75 }];
    const out = attachSpyOverlay(rows, { yearStart, inflationPct: 3, gdpGrowthPct: 5 });
    const anchor = spyPriceAtYear(yearStart);
    const rates = spyScenarioRates(3, 5);

    expect(out[0].spy).toBeCloseTo(585, 8);
    expect(out[0].spyReal).toBeCloseTo(toRealDollarsAtAnchor(out[0].spy, out[0].year, yearStart), 8);

    expect(out[1].spy).toBeCloseTo(anchor, 8);
    expect(out[1].spyReal).toBeCloseTo(anchor, 8);

    const delta = 0.5;
    expect(out[2].spy).toBeCloseTo(anchor * Math.pow(1 + rates.nominalReturn, delta), 8);
    expect(out[2].spyReal).toBeCloseTo(anchor * Math.pow(1 + rates.realReturn, delta), 8);
  });

  it("moves projected nominal from bear to bull with bullishness", () => {
    const yearStart = 2025.25;
    const rows = [{ year: 2025.25 }, { year: 2026.25 }];
    const bear = attachSpyOverlay(rows, { yearStart, inflationPct: 3, gdpGrowthPct: 5, spyBullishness: 0 });
    const bull = attachSpyOverlay(rows, { yearStart, inflationPct: 3, gdpGrowthPct: 5, spyBullishness: 1 });
    expect(bull[1].spy).toBeGreaterThan(bear[1].spy);
    expect(bull[1].spyReal).toBeGreaterThan(bear[1].spyReal);
  });
});

describe("scaleSpyOverlayToBtcAtAnchor", () => {
  it("scales all SPY fields so the anchor row meets nominal BTC", () => {
    const yearStart = 2026.0;
    const rows = [
      { year: 2025.0, price: 80000, spy: 400 },
      { year: 2026.0, price: 100000, spy: 500, spyReal: 490 },
      { year: 2027.0, price: 110000, spy: 550, spyReal: 530 },
    ];

    const out = scaleSpyOverlayToBtcAtAnchor(rows, yearStart);
    const scale = 100000 / 500;

    expect(out[1].spy).toBeCloseTo(100000, 8);
    expect(out[0].spy).toBeCloseTo(400 * scale, 8);
    expect(out[2].spy).toBeCloseTo(550 * scale, 8);
    expect(out[2].spyReal).toBeCloseTo(530 * scale, 8);
  });
});
