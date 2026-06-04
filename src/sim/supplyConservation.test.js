import { describe, expect, it } from "vitest";
import { MONTHS_PER_YEAR, SIM_MONTH_DAYS, YEAR_START, withParamDefaults } from "./config/constants.js";
import { LIQ_FLOOR } from "./holders/holderBuckets.js";
import { getDailyMining } from "./supply/mining.js";
import { runSim } from "./runSim.js";

/** Sum of every modeled BTC bucket in a row (millions of BTC). */
function totalSupplyM(row) {
  return (
    row.liquidM +
    row.treasuryM +
    row.etfM +
    row.lostM +
    row.lthYoungM +
    row.ancientM +
    row.retailM +
    row.minerHeldM
  );
}

function conservationParams(overrides = {}) {
  return withParamDefaults({
    randomSeed: 1,
    simYears: 10,
    initialAnnualVolatility: 0,
    halvingNarrativeAmp: 0,
    minerSellPct: 100,
    annualLossRate: 0,
    initialRetailPurchaseRateM: 0,
    strcInitialUsdB: 0,
    otherTreasuryUsdB: 0,
    etfDailyInflowM: 0,
    strcGrowthRate: 0,
    otherTreasuryGrowth: 0,
    etfGrowthRate: 0,
    organicBuyGrowth: 0,
    ...overrides,
  });
}

/** Approximate cumulative issuance (BTC) over simYears with default halving schedule. */
function expectedCumulativeIssuanceBtc(simYears) {
  let sum = 0;
  const months = simYears * MONTHS_PER_YEAR;
  for (let m = 0; m < months; m++) {
    const year = YEAR_START + m / MONTHS_PER_YEAR;
    sum += getDailyMining(year) * SIM_MONTH_DAYS;
  }
  return sum;
}

describe("runSim supply accounting", () => {
  it("keeps retailM and minerHeldM at zero without retail and with full miner sell-through", () => {
    const { data } = runSim(conservationParams());
    for (const row of data) {
      expect(row.retailM).toBe(0);
      expect(row.minerHeldM).toBe(0);
    }
  });

  it("increases total supply only by cumulative issuance when retail and loss are off", () => {
    const p = conservationParams({ simYears: 10 });
    const { data } = runSim(p);
    const growthM = totalSupplyM(data[data.length - 1]) - totalSupplyM(data[0]);
    expect(growthM).toBeCloseTo(expectedCumulativeIssuanceBtc(p.simYears) / 1e6, 2);
  });

  it("keeps liquid at or above LIQ_FLOOR for every month when the float cap is on", () => {
    const { data } = runSim(
      conservationParams({
        circulatingSupply: 1_000_000,
        alreadyLostCoins: 0,
        strcInitialBtc: 0,
        otherInitialBtc: 0,
        etfInitialBtc: 0,
        strcInitialUsdB: 1_000,
        strcGrowthRate: 15,
        capBuyingToLiquidFloat: true,
      })
    );
    const floorM = LIQ_FLOOR / 1e6;
    for (const row of data) {
      expect(row.liquidM).toBeGreaterThanOrEqual(floorM - 1e-9);
    }
  });

  it("never lets ETF holdings go negative and never sells more than it holds", () => {
    const { data } = runSim(
      conservationParams({
        etfDailyInflowM: 0,
        etfInitialBtc: 50_000,
        etfOutflowShockPct: 10,
        etfStressRedemptionCount: 3,
        simYears: 15,
        strcInitialBtc: 0,
        otherInitialBtc: 0,
      })
    );
    for (const row of data) {
      expect(row.etfM).toBeGreaterThanOrEqual(0);
    }
  });

  it("treasury holdings are monotonically non-decreasing (model has no corporate distribution path)", () => {
    const { data } = runSim(conservationParams({ randomSeed: 7 }));
    for (let i = 1; i < data.length; i++) {
      expect(data[i].treasuryM).toBeGreaterThanOrEqual(data[i - 1].treasuryM - 1e-9);
    }
  });

  it("is deterministic for a fixed random seed and varies when the seed changes", () => {
    const a = JSON.stringify(runSim(withParamDefaults({ randomSeed: 4242 })).data);
    const b = JSON.stringify(runSim(withParamDefaults({ randomSeed: 4242 })).data);
    const c = JSON.stringify(runSim(withParamDefaults({ randomSeed: 4243 })).data);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("conserves total supply under sustained retail net buying (liquid ↔ retail only)", () => {
    const base = conservationParams({
      strcInitialBtc: 0,
      otherInitialBtc: 0,
      etfInitialBtc: 0,
    });
    const buyer = runSim({ ...base, initialRetailPurchaseRateM: 20 }).data;
    const flat = runSim({ ...base, initialRetailPurchaseRateM: 0 }).data;
    const buyerChange = totalSupplyM(buyer[buyer.length - 1]) - totalSupplyM(buyer[0]);
    const flatChange = totalSupplyM(flat[flat.length - 1]) - totalSupplyM(flat[0]);
    expect(Math.abs(buyerChange - flatChange)).toBeLessThan(0.005);
    expect(buyer[buyer.length - 1].retailM).toBeGreaterThan(0);
  });

  it("conserves total supply under sustained retail net selling and caps sells by retail stock", () => {
    const base = conservationParams({
      strcInitialBtc: 0,
      otherInitialBtc: 0,
      etfInitialBtc: 0,
      initialRetailPurchaseRateM: 50,
      simYears: 3,
    });
    const { data: hoard } = runSim(base);
    const hoardRetail = hoard[hoard.length - 1].retailM;
    expect(hoardRetail).toBeGreaterThan(0);

    const seller = runSim({
      ...base,
      initialRetailPurchaseRateM: -20,
      simYears: 10,
    }).data;
    const flat = runSim({ ...base, initialRetailPurchaseRateM: 0, simYears: 10 }).data;
    const flatChange = totalSupplyM(flat[flat.length - 1]) - totalSupplyM(flat[0]);
    const sellerChange = totalSupplyM(seller[seller.length - 1]) - totalSupplyM(seller[0]);
    expect(Math.abs(sellerChange - flatChange)).toBeLessThan(0.01);
    for (const row of seller) {
      expect(row.retailM).toBeGreaterThanOrEqual(0);
    }
    const maxRetail = Math.max(...seller.map((r) => r.retailM));
    expect(maxRetail).toBeLessThanOrEqual(hoardRetail + 0.01);
  });

  it("grows total supply by cumulative issuance when mining sells and holds are tracked", () => {
    const p = conservationParams({
      minerSellPct: 45,
      simYears: 10,
    });
    const { data } = runSim(p);
    const initialTotal = totalSupplyM(data[0]);
    const finalTotal = totalSupplyM(data[data.length - 1]);
    const expectedGrowthM = expectedCumulativeIssuanceBtc(p.simYears) / 1e6;
    expect(finalTotal - initialTotal).toBeCloseTo(expectedGrowthM, 2);
    for (let i = 1; i < data.length; i++) {
      expect(data[i].minerHeldM).toBeGreaterThanOrEqual(data[i - 1].minerHeldM - 1e-9);
    }
    expect(data[data.length - 1].minerHeldM).toBeGreaterThan(0);
  });
});
