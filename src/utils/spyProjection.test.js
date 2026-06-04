import { describe, expect, it } from "vitest";
import {
  attachSpyOverlay,
  blendMomentumReturn,
  decayBlendRate,
  decayRateIntegral,
  dynamicBullBearSpread,
  logLinearAnnualReturn,
  projectedPriceContinuous,
  resolveMomentumReturn,
  resolveSpyHistoricalPoints,
  scaleSpyOverlayToBtcAtAnchor,
  spyNominalProjectedReturn,
  spyPriceAtYear,
  spyScenarioRates,
  trailingCagr,
  valuationPremium,
} from "./spyProjection.js";
import { toRealDollarsAtAnchor } from "./cpiUs.js";

describe("spyPriceAtYear", () => {
  it("linearly interpolates between adjacent monthly closes", () => {
    const monthly = [
      { year: 2011.0, price: 100 },
      { year: 2011.083, price: 112 },
      { year: 2011.167, price: 118 },
    ];
    const interpolated = spyPriceAtYear(2011.0415, monthly);
    expect(interpolated).toBeCloseTo(106, 6);
  });
});

describe("spyScenarioRates", () => {
  it("matches reference return assumptions", () => {
    const rates = spyScenarioRates(3, 5);
    expect(rates.earningsGrowth).toBeCloseTo(0.0325, 8);
    expect(rates.nominalReturn).toBeCloseTo(0.0475, 8);
    expect(rates.realReturn).toBeCloseTo(0.0175, 8);
  });

  it("increases nominal return when effective GDP includes AI uplift", () => {
    const base = spyScenarioRates(3, 5);
    const withAi = spyScenarioRates(3, 6);
    expect(withAi.nominalReturn).toBeGreaterThan(base.nominalReturn);
  });
});

describe("momentum and spread helpers", () => {
  const rising = [
    { year: 2020, price: 100 },
    { year: 2021, price: 120 },
    { year: 2022, price: 144 },
    { year: 2023, price: 173 },
    { year: 2024, price: 208 },
    { year: 2025, price: 250 },
  ];

  it("computes trailing CAGR over window", () => {
    const r = trailingCagr(rising, 2025, 5);
    expect(r).toBeGreaterThan(0.15);
  });

  it("computes log-linear annual return", () => {
    const r = logLinearAnnualReturn(rising, 2025, 10);
    expect(r).toBeGreaterThan(0.1);
  });

  it("blendMomentumReturn clamps high values", () => {
    expect(blendMomentumReturn(0.5, 0.6, 0.5)).toBeLessThanOrEqual(0.25);
  });

  it("projectedPriceContinuous exceeds flat macro when momentum is higher", () => {
    const macro = 0.04;
    const mom = 0.12;
    const pDecay = projectedPriceContinuous(100, 5, macro, mom, 7, 0);
    const pFlat = 100 * Math.pow(1 + macro, 5);
    expect(pDecay).toBeGreaterThan(pFlat);
  });

  it("decay blend starts at momentum and approaches macro over time", () => {
    const macro = 0.05;
    const mom = 0.15;
    expect(decayBlendRate(0, macro, mom, 7)).toBeCloseTo(mom, 6);
    expect(decayBlendRate(80, macro, mom, 7)).toBeCloseTo(macro, 2);
  });

  it("dynamicBullBearSpread widens with bullishness and vol", () => {
    const low = dynamicBullBearSpread({ realizedVol: 0.05, valuationPremium: 0, bullishness: 0.5 });
    const high = dynamicBullBearSpread({ realizedVol: 0.25, valuationPremium: 0.05, bullishness: 1 });
    expect(high).toBeGreaterThan(low);
  });

  it("valuationPremium caps excess momentum over earnings", () => {
    expect(valuationPremium(0.2, 0.03)).toBe(0.06);
    expect(valuationPremium(0.02, 0.03)).toBe(0);
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
    const out = attachSpyOverlay(rows, { yearStart, inflationPct: 3, gdpGrowthPct: 5, spyBullishness: 0.5 });
    const anchor = spyPriceAtYear(yearStart);
    const rates = spyScenarioRates(3, 5);
    const hist = resolveSpyHistoricalPoints(undefined, yearStart);
    const rMomentum = resolveMomentumReturn(hist, yearStart) ?? rates.nominalReturn;

    expect(out[0].spy).toBeCloseTo(585, 8);
    expect(out[0].spyReal).toBeCloseTo(toRealDollarsAtAnchor(out[0].spy, out[0].year, yearStart), 8);

    expect(out[1].spy).toBeCloseTo(anchor, 8);
    expect(out[1].spyReal).toBeCloseTo(anchor, 8);

    const delta = 0.5;
    const expected = projectedPriceContinuous(anchor, delta, rates.nominalReturn, rMomentum, 7, 0);
    expect(out[2].spy).toBeCloseTo(expected, 6);
  });

  it("moves projected nominal from bear to bull with bullishness", () => {
    const yearStart = 2025.25;
    const rows = [{ year: 2025.25 }, { year: 2026.25 }];
    const bear = attachSpyOverlay(rows, { yearStart, inflationPct: 3, gdpGrowthPct: 5, spyBullishness: 0 });
    const bull = attachSpyOverlay(rows, { yearStart, inflationPct: 3, gdpGrowthPct: 5, spyBullishness: 1 });
    expect(bull[1].spy).toBeGreaterThan(bear[1].spy);
    expect(bull[1].spyReal).toBeGreaterThan(bear[1].spyReal);
  });

  it("uses provided monthly historical points when available", () => {
    const yearStart = 2025.25;
    const rows = [{ year: 2025.0 }, { year: 2025.25 }];
    const spyHistoricalPoints = [
      { year: 2025.0, price: 610 },
      { year: 2025.083, price: 560 },
      { year: 2025.25, price: 590 },
    ];
    const out = attachSpyOverlay(rows, {
      yearStart,
      inflationPct: 3,
      gdpGrowthPct: 5,
      spyHistoricalPoints,
    });

    expect(out[0].spy).toBeCloseTo(610, 8);
    expect(out[1].spy).toBeCloseTo(590, 8);
  });

  it("keeps historical and projected SPY continuous at the Now anchor", () => {
    const yearStart = 2026.421;
    const spyHistoricalPoints = [
      { year: 2026.25, price: 6957 },
      { year: 2026.333, price: 7413 },
    ];
    const rows = [
      { year: 2026.411, price: 64000 },
      { year: 2026.421, price: 64000 },
      { year: 2026.504, price: 65000 },
    ];
    let out = attachSpyOverlay(rows, {
      yearStart,
      inflationPct: 3,
      gdpGrowthPct: 5,
      spyBullishness: 0.5,
      spyHistoricalPoints,
    });
    out = scaleSpyOverlayToBtcAtAnchor(out, yearStart);

    const lastHist = out.find((r) => r.year < yearStart - 1e-4);
    const firstProj = out.find((r) => r.year >= yearStart - 1e-4);
    expect(lastHist?.spy).toBeCloseTo(firstProj?.spy ?? 0, 0);
  });

  it("uses monthly JSON fallback when historical points omitted", () => {
    const yearStart = 2025.5;
    const rows = [{ year: 2025.25 }, { year: 2026.25 }];
    const withFallback = attachSpyOverlay(rows, {
      yearStart,
      inflationPct: 3,
      gdpGrowthPct: 4,
      spyBullishness: 0.5,
    });
    expect(withFallback[1].spy).toBeGreaterThan(withFallback[0].spy);
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
