import { describe, expect, it } from "vitest";
import { withParamDefaults } from "./config/constants.js";
import { LIQ_FLOOR } from "./holders/holderBuckets.js";
import { runSim } from "./runSim.js";

/** Sum of every modeled BTC bucket in a row (millions of BTC). */
function totalSupplyM(row) {
  return row.liquidM + row.treasuryM + row.etfM + row.lostM + row.lthYoungM + row.ancientM;
}

function conservationParams(overrides = {}) {
  return withParamDefaults({
    randomSeed: 1,
    simYears: 10,
    initialAnnualVolatility: 0,
    halvingNarrativeAmp: 0,
    minerSellPct: 0,
    annualLossRate: 0,
    initialRetailPurchaseRateM: 0,
    ...overrides,
  });
}

describe("runSim supply accounting", () => {
  it("conserves total BTC across all buckets when there are no external inflows (no mining, loss, or retail)", () => {
    // With miner sales, coin loss, and retail flow disabled, every monthly step is an internal
    // transfer between liquid / treasury / ETF / young-LTH / ancient, so the grand total is invariant.
    const { data } = runSim(conservationParams());
    const initialTotal = totalSupplyM(data[0]);
    for (const row of data) {
      // Tolerance reflects per-field rounding to 1e-3 M (1,000 BTC) on six stacked buckets.
      expect(Math.abs(totalSupplyM(row) - initialTotal)).toBeLessThan(0.005);
    }
  });

  it("keeps liquid at or above LIQ_FLOOR for every month when the float cap is on", () => {
    // Aggressive institutional demand against a small float would otherwise drive liquid negative.
    const { data } = runSim(
      conservationParams({
        circulatingSupply: 1_000_000,
        alreadyLostCoins: 0,
        strcInitialBtc: 0,
        otherInitialBtc: 0,
        etfInitialBtc: 0,
        strcInitialUsdB: 1_000,
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

  // --- Known accounting limitation (documented as a regression guard) ---
  // Retail net flow drains/refills the liquid float but is NOT credited to or debited from any
  // tracked holder bucket. As a result the stacked-supply total is NOT conserved when retail flow
  // is non-zero: sustained net BUYING makes tracked coins disappear, and (more problematically)
  // sustained net SELLING injects phantom BTC into liquid with no stock limit. The price mechanism
  // (float drain) is intentional, but the supply breakdown chart will not reconcile to a constant.
  it("documents that retail net buying reduces the tracked total (coins leave the visible accounting)", () => {
    const base = conservationParams({ strcInitialUsdB: 0, otherTreasuryUsdB: 0, etfDailyInflowM: 0 });
    const buyer = runSim({ ...base, initialRetailPurchaseRateM: 20 }).data;
    const flat = runSim({ ...base, initialRetailPurchaseRateM: 0 }).data;
    const buyerChange = totalSupplyM(buyer[buyer.length - 1]) - totalSupplyM(buyer[0]);
    const flatChange = totalSupplyM(flat[flat.length - 1]) - totalSupplyM(flat[0]);
    expect(Math.abs(flatChange)).toBeLessThan(0.005);
    expect(buyerChange).toBeLessThan(-0.1);
  });

  it("documents that retail net selling inflates the tracked total (phantom supply, unbounded by any stock)", () => {
    const base = conservationParams({ strcInitialUsdB: 0, otherTreasuryUsdB: 0, etfDailyInflowM: 0 });
    const seller = runSim({ ...base, initialRetailPurchaseRateM: -20 }).data;
    const sellerChange = totalSupplyM(seller[seller.length - 1]) - totalSupplyM(seller[0]);
    expect(sellerChange).toBeGreaterThan(0.1);
  });
});
