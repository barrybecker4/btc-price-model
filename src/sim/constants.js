/**
 * Fractional calendar year at module load (local "today"), so the sim and charts
 * anchor to the current date instead of a fixed Jan 1.
 */
export function getSimulationAnchorYear() {
  const d = new Date();
  const y = d.getFullYear();
  const start = new Date(y, 0, 1);
  const next = new Date(y + 1, 0, 1);
  return y + (d - start) / (next - start);
}

export const YEAR_START = getSimulationAnchorYear();

/** Months per calendar year (annual ↔ monthly rates in the sim). Not the same as DEFAULT_TAPER_YEARS. */
export const MONTHS_PER_YEAR = 12;

/** Default logistic taper horizon (years) for MSTR, other treasury, and ETF growth; single source of truth. */
export const DEFAULT_TAPER_YEARS = 12;

export const DEFAULTS = {
  simYears: 15,
  startPrice: 85000,
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
  /** Years over which MSTR USD raise growth logistically tapers to nominal GDP. */
  strcGrowthTaperYears: DEFAULT_TAPER_YEARS,
  otherInitialBtc: 200000,
  otherTreasuryUsdB: 20,
  otherTreasuryGrowth: 40,
  /** Years over which other corporate treasury growth tapers to nominal GDP. */
  otherTreasuryGrowthTaperYears: DEFAULT_TAPER_YEARS,
  etfInitialBtc: 1000000,
  etfDailyInflowM: 100,
  etfGrowthRate: 15,
  /** Years over which ETF USD inflow growth tapers to nominal GDP. */
  etfGrowthTaperYears: DEFAULT_TAPER_YEARS,
  organicDailyBuy: 200,
  organicDailySell: 500,
  organicBuyGrowth: 8,
  organicSellDecline: 5,
  baseElasticity: 1.5,
  maxMonthlyPctGain: 20,
  /** Annualized BTC-style price volatility (%), wide range vs typical equities. */
  initialAnnualVolatility: 73,
  /**
   * How much of that monthly noise fades from sim start to end (0–100%).
   * 0 = full initial vol throughout; 100 = noise → 0 by the last month. Default 90%.
   */
  volatilityReduction: 90,
  /**
   * When true, monthly gross hoarding (MSTR + other treasury + ETF + organic buy) cannot exceed
   * liquid − LIQ_FLOOR + miner sales + organic sells − coin loss. Shortfall is spread proportionally.
   */
  capBuyingToLiquidFloat: true,

  /**
   * When float cap binds, extra monthly price return ∝ unmetBuyBtcM / liquid (before global monthly cap).
   * 0 = off. Typical 0.3–1.5.
   */
  unmetDemandPriceStrength: 0.6,
  /** Ceiling on the unmet-demand premium alone, as % per month (e.g. 8 = at most +8%/mo from this term). */
  unmetPremiumMaxMonthlyPct: 8,

  /** 0–1: halving-cycle strength (1 = full ~70% drawdown potential in bear leg vs local peak, with muted structural flows). */
  halvingNarrativeAmp: 0.08,
  /** Each successive halving cycle retains this fraction of the prior cycle’s narrative strength (1 = no fade). */
  halvingImpactDecay: 0.88,

  /** Share of (circ − lost − treasury − ETF) modeled as 155d+ LTH total (young + ancient). */
  lth155SharePct: 73,
  /** Share of that same pool that is Ancient (7y+); must be ≤ LTH155 total share (nested). */
  ancientSharePct: 17,
  /**
   * Signed annual flow: % of current liquid / year → young LTH (155d+ non-ancient). Positive = lock from liquid; negative = distribute from young LTH to liquid.
   */
  flowLiquidToLth155Annual: 0,
  /**
   * Signed annual flow: % of current liquid / year → Ancient. Positive = lock from liquid; negative = ancient coins selling to liquid.
   */
  flowLiquidToAncientAnnual: 0,
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
  // Removed UI-only bond yield (never fed the sim); strip from older merged state.
  delete merged.bondYield;
  return merged;
}
