import { describe, expect, it } from "vitest";
import { buildSimulationRow } from "./simulationRow.js";

const baseDemand = {
  strcDayBtc: 0,
  etfDayBtc: 0,
  otherDayBtc: 0,
  totalBuyDay: 0,
  totalSellDay: 0,
  buyRationPercent: 0,
  unmetBuyBtcMonthly: 0,
  unmetDemandPremiumMonthly: 0,
};

describe("buildSimulationRow inflation display", () => {
  it("keeps anchor-month nominal equal to real", () => {
    const row = buildSimulationRow({
      year: 2026,
      price: 100_000,
      inflationPercent: 10,
      monthIndex: 0,
      liquid: 1e6,
      treasury: 0,
      etfBtc: 0,
      lostBtc: 0,
      youngLthBtc: 0,
      ancientBtc: 0,
      retailHeldBtc: 0,
      minerHeldBtc: 0,
      liquidPercentOfInitial: 100,
      demand: baseDemand,
      dailyMining: 450,
    });
    expect(row.price).toBe(100_000);
    expect(row.priceReal).toBe(100_000);
  });

  it("raises nominal but not real when inflation increases at the same horizon", () => {
    const common = {
      year: 2031,
      price: 200_000,
      monthIndex: 60,
      liquid: 1e6,
      treasury: 0,
      etfBtc: 0,
      lostBtc: 0,
      youngLthBtc: 0,
      ancientBtc: 0,
      retailHeldBtc: 0,
      minerHeldBtc: 0,
      liquidPercentOfInitial: 100,
      demand: baseDemand,
      dailyMining: 450,
    };
    const low = buildSimulationRow({ ...common, inflationPercent: 1 });
    const high = buildSimulationRow({ ...common, inflationPercent: 15 });
    expect(low.priceReal).toBe(high.priceReal);
    expect(high.price).toBeGreaterThan(low.price);
    expect(high.priceReal).toBe(200_000);
  });
});
