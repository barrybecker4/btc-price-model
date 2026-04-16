export const YEAR_START = 2026;

export const DEFAULTS = {
  simYears: 15,
  startPrice: 85000,
  bondYield: 4.5,
  inflation: 3.0,
  gdpGrowth: 3.5,
  circulatingSupply: 19850000,
  alreadyLostCoins: 3700000,
  annualLossRate: 0.2,
  minerSellPct: 85,
  miningCostFloor: 35000,
  strcInitialBtc: 500000,
  strcInitialUsdB: 83,
  strcGrowthRate: 20,
  otherInitialBtc: 200000,
  otherTreasuryUsdB: 20,
  otherTreasuryGrowth: 40,
  etfInitialBtc: 1000000,
  etfDailyInflowM: 100,
  etfGrowthRate: 15,
  organicDailyBuy: 200,
  organicDailySell: 500,
  organicBuyGrowth: 8,
  organicSellDecline: 5,
  baseElasticity: 1.5,
  maxMonthlyPctGain: 20,
  /** 0–1: halving-cycle strength (1 = full ~70% drawdown potential in bear leg vs local peak, with muted structural flows). */
  halvingNarrativeAmp: 0.08,
  /** Each successive halving cycle retains this fraction of the prior cycle’s narrative strength (1 = no fade). */
  halvingImpactDecay: 0.88,
};

/** Merge saved/partial state with DEFAULTS so new params never read as undefined (avoids NaN in UI and math). */
export function withParamDefaults(p) {
  const merged = { ...DEFAULTS, ...p };
  for (const key of Object.keys(DEFAULTS)) {
    const v = merged[key];
    if (v === undefined || (typeof v === "number" && Number.isNaN(v))) {
      merged[key] = DEFAULTS[key];
    }
  }
  // Legacy: strength was a tiny 0–0.02 monthly factor; map to 0–1
  if (
    typeof merged.halvingNarrativeAmp === "number" &&
    merged.halvingNarrativeAmp > 0 &&
    merged.halvingNarrativeAmp <= 0.021
  ) {
    merged.halvingNarrativeAmp = Math.min(1, merged.halvingNarrativeAmp / 0.02);
  }
  return merged;
}
