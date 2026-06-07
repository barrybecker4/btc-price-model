import { describe, expect, it } from "vitest";
import { buildHistoricalBundle } from "./buildHistoricalBundle.js";
import { runWalkForwardBacktest } from "./walkForward.js";

const MS_PER_DAY = 86400000;

/**
 * @param {number} days
 * @param {number} startPrice
 */
function syntheticBtc(days, startPrice = 50_000) {
  const startMs = Date.UTC(2023, 0, 1);
  /** @type {import("../forecastTypes.js").DailyClosePoint[]} */
  const points = [];
  let price = startPrice;
  for (let i = 0; i < days; i++) {
    price *= 1 + 0.002 * Math.sin(i / 7) + 0.001 * (Math.random() - 0.5);
    points.push({ timestampMs: startMs + i * MS_PER_DAY, price });
  }
  return points;
}

/**
 * @param {number} days
 */
function syntheticSpy(days) {
  const startMs = Date.UTC(2023, 0, 1);
  /** @type {import("../forecastTypes.js").DailyClosePoint[]} */
  const points = [];
  let price = 4000;
  for (let i = 0; i < days; i++) {
    price *= 1 + 0.0005 * Math.sin(i / 9);
    points.push({ timestampMs: startMs + i * MS_PER_DAY, price });
  }
  return points;
}

describe("walkForward backtest", () => {
  it("buildHistoricalBundle requires sufficient history", () => {
    const btc = syntheticBtc(40);
    const spy = syntheticSpy(40);
    const asOf = btc[35].timestampMs;
    const bundle = buildHistoricalBundle(asOf, btc, spy);
    expect(bundle).not.toBeNull();
    expect(bundle?.spotUsd).toBeGreaterThan(0);
  });

  it("runWalkForwardBacktest produces model and baseline metrics", () => {
    const btc = syntheticBtc(400);
    const spy = syntheticSpy(400);
    const report = runWalkForwardBacktest({
      btcDaily: btc,
      spyDaily: spy,
      warmupDays: 60,
      holdoutDays: 120,
      stepDays: 14,
      maxSamples: 8,
    });

    expect(report.config.sampleCount).toBeGreaterThan(0);
    expect(Number.isFinite(report.model.horizon24h.crps)).toBe(true);
    expect(Number.isFinite(report.model.horizon168h.crps)).toBe(true);
    expect(Number.isFinite(report.baseline.horizon24h.crps)).toBe(true);
    expect(report.model.horizon24h.calibration.bins.length).toBe(10);
    expect(report.notes.length).toBeGreaterThan(0);
  });
});
