import { DEFAULT_TAPER_YEARS, MONTHS_PER_YEAR, YEAR_START } from "./constants.js";
import { effectiveAnnualGrowthTapered } from "./growthTaper.js";
import { getHalvingCycleMonthlyAdj } from "./halving.js";
import { getDailyMining } from "./mining.js";
import {
  monthlySigmaFromAnnual,
  unitShockForMonth,
  volatilityTimeDecayMultiplier,
} from "./volatility.js";

const LIQ_FLOOR = 50000;
/** Initial liquid must be at least this after LTH/Ancient split (matches legacy single-pool floor scale). */
const LIQ_MIN_INIT = 200000;

/**
 * Split available float (non-lost, non-treasury, non-ETF) into liquid vs nested LTH (young + ancient).
 * Clamps so ancient ≤ total LTH155 and liquid ≥ LIQ_MIN_INIT when possible.
 */
function initialHolderSplit(available0, lth155SharePct, ancientSharePct) {
  const lPct = Math.max(60, Math.min(80, lth155SharePct)) / 100;
  const aPct = Math.max(15, Math.min(20, ancientSharePct)) / 100;
  let lth155Total = available0 * lPct;
  let ancientBtc = Math.min(available0 * aPct, lth155Total);
  let youngLth = lth155Total - ancientBtc;
  let liquid = available0 - lth155Total;

  if (liquid < LIQ_MIN_INIT && available0 > LIQ_MIN_INIT) {
    const shortfall = LIQ_MIN_INIT - liquid;
    lth155Total = Math.max(0, lth155Total - shortfall);
    ancientBtc = Math.min(ancientBtc, lth155Total);
    youngLth = lth155Total - ancientBtc;
    liquid = available0 - lth155Total;
  }

  return { liquid, youngLth, ancientBtc, lth155Total };
}

/**
 * After demand step, apply signed annual flows (%/yr of liquid stock toward buckets; negative pulls from bucket).
 * Order: scale positive outflows so liquid stays ≥ LIQ_FLOOR; then negative inflows from young/ancient.
 */
function applyHolderFlows(liquid, youngLth, ancientBtc, p) {
  const rL = typeof p.flowLiquidToLth155Annual === "number" ? p.flowLiquidToLth155Annual : 0;
  const rA = typeof p.flowLiquidToAncientAnnual === "number" ? p.flowLiquidToAncientAnnual : 0;

  let L = liquid;
  let Y = youngLth;
  let A = ancientBtc;

  const mL = (rL / 100) * L / MONTHS_PER_YEAR;
  const mA = (rA / 100) * L / MONTHS_PER_YEAR;

  let outY = mL > 0 ? mL : 0;
  let outA = mA > 0 ? mA : 0;
  let room = Math.max(0, L - LIQ_FLOOR);
  const totalOut = outY + outA;
  if (totalOut > room && totalOut > 0) {
    const s = room / totalOut;
    outY *= s;
    outA *= s;
  }
  L -= outY + outA;
  Y += outY;
  A += outA;

  if (rL < 0) {
    const tfr = Math.min(Y, (Math.abs(rL) / 100) * Y / MONTHS_PER_YEAR);
    Y -= tfr;
    L += tfr;
  }
  if (rA < 0) {
    const tfr = Math.min(A, (Math.abs(rA) / 100) * A / MONTHS_PER_YEAR);
    A -= tfr;
    L += tfr;
  }

  L = Math.max(L, LIQ_FLOOR);
  Y = Math.max(Y, 0);
  A = Math.max(A, 0);

  return { liquid: L, youngLth: Y, ancientBtc: A };
}

export function runSim(p) {
  const months = p.simYears * MONTHS_PER_YEAR;
  const safeLost = Math.min(p.alreadyLostCoins, p.circulatingSupply * 0.9);

  let price = p.startPrice;
  let lostBtc = safeLost;
  let treasury = p.strcInitialBtc + p.otherInitialBtc;
  let etfBtc = p.etfInitialBtc;

  const available0 = Math.max(p.circulatingSupply - lostBtc - treasury - etfBtc, 0);
  const { liquid: liq0, youngLth, ancientBtc: anc0 } = initialHolderSplit(
    available0,
    p.lth155SharePct ?? 73,
    p.ancientSharePct ?? 17
  );
  let liquid = Math.max(liq0, LIQ_FLOOR);
  let youngLthBtc = youngLth;
  let ancientBtc = anc0;

  const initLiq = liquid;

  let strcUSD = (p.strcInitialUsdB * 1e9) / MONTHS_PER_YEAR;
  let otherUSD = (p.otherTreasuryUsdB * 1e9) / MONTHS_PER_YEAR;
  let etfUSD = p.etfDailyInflowM * 1e6 * 30;
  let buyBtcM = p.organicDailyBuy * 30;
  let sellBtcM = p.organicDailySell * 30;

  const gdpMonthlyBoost = p.gdpGrowth / 100 / MONTHS_PER_YEAR;

  const data = [];
  let supplyShockYear = null;

  for (let m = 0; m <= months; m++) {
    const year = YEAR_START + m / MONTHS_PER_YEAR;
    const dailyMining = getDailyMining(year);
    const liquidPct = (liquid / initLiq) * 100;
    if (liquidPct < 30 && !supplyShockYear) supplyShockYear = year;

    const dailyMiningM = dailyMining * 30;
    const minerSales = dailyMiningM * (p.minerSellPct / 100);
    const coinsLost = liquid * (p.annualLossRate / 100 / MONTHS_PER_YEAR);

    const strcBtcRaw = strcUSD / price;
    const otherBtcRaw = otherUSD / price;
    const etfBtc2Raw = etfUSD / price;
    const G_raw = strcBtcRaw + otherBtcRaw + etfBtc2Raw + buyBtcM;

    const capOn = p.capBuyingToLiquidFloat !== false;
    let buyScale = 1;
    if (capOn && G_raw > 0) {
      const G_max = liquid - LIQ_FLOOR + minerSales + sellBtcM - coinsLost;
      buyScale = G_max <= 0 ? 0 : Math.min(1, G_max / G_raw);
    }

    const strcBtc = strcBtcRaw * buyScale;
    const otherBtc = otherBtcRaw * buyScale;
    const etfBtc2 = etfBtc2Raw * buyScale;
    const buyBtcMExec = buyBtcM * buyScale;
    const G_exec = strcBtc + otherBtc + etfBtc2 + buyBtcMExec;
    const unmetBuyBtcM = G_raw - G_exec;
    const buyRationPct = G_raw > 0 ? (unmetBuyBtcM / G_raw) * 100 : 0;

    const Lref = Math.max(liquid, 50000);
    let unmetPremiumMonthly = 0;
    if (capOn && unmetBuyBtcM > 0) {
      const K = typeof p.unmetDemandPriceStrength === "number" ? p.unmetDemandPriceStrength : 0.6;
      const maxPrem =
        (typeof p.unmetPremiumMaxMonthlyPct === "number" ? p.unmetPremiumMaxMonthlyPct : 8) / 100;
      const tightness = unmetBuyBtcM / Lref;
      unmetPremiumMonthly = Math.min(tightness * K, maxPrem);
    }

    const strcDayBtc = strcBtc / 30;
    const otherDayBtc = otherBtc / 30;
    const etfDayBtc = etfBtc2 / 30;
    const minerSellDay = dailyMining * (p.minerSellPct / 100);
    const totalBuyDay = strcDayBtc + otherDayBtc + etfDayBtc + buyBtcMExec / 30;
    const totalSellDay = minerSellDay + sellBtcM / 30;

    data.push({
      year: parseFloat(year.toFixed(3)),
      price: Math.round(price),
      priceReal: Math.round(price / Math.pow(1 + p.inflation / 100, m / MONTHS_PER_YEAR)),
      liquidM: parseFloat((liquid / 1e6).toFixed(3)),
      treasuryM: parseFloat((treasury / 1e6).toFixed(3)),
      etfM: parseFloat((etfBtc / 1e6).toFixed(3)),
      lostM: parseFloat((lostBtc / 1e6).toFixed(3)),
      lthYoungM: parseFloat((youngLthBtc / 1e6).toFixed(3)),
      ancientM: parseFloat((ancientBtc / 1e6).toFixed(3)),
      liquidPct: parseFloat(liquidPct.toFixed(1)),
      strcDayBtc: parseFloat(strcDayBtc.toFixed(0)),
      etfDayBtc: parseFloat(etfDayBtc.toFixed(0)),
      otherDayBtc: parseFloat(otherDayBtc.toFixed(0)),
      dailyMining: parseFloat(dailyMining.toFixed(1)),
      totalBuyDay: parseFloat(totalBuyDay.toFixed(0)),
      totalSellDay: parseFloat(totalSellDay.toFixed(0)),
      netDayDemand: parseFloat((totalBuyDay - totalSellDay).toFixed(0)),
      buyRationPct: parseFloat(buyRationPct.toFixed(1)),
      unmetBuyBtcM: parseFloat(unmetBuyBtcM.toFixed(0)),
      unmetPremiumPct: parseFloat((unmetPremiumMonthly * 100).toFixed(2)),
    });

    if (m === months) break;

    /**
     * Monthly transition (mass conservation among modeled buckets):
     * 1. Compute net demand from treasuries, ETFs, organic buy/sell, miners (all vs tradeable `liquid`).
     * 2. Price update from elasticity (on `liquid`), halving overlay, vol shock; floor at mining cost.
     * 3. Apply structural drain: `liquid -= netDemand + coinsLost`, treasuries/ETFs up, `lostBtc` up from `coinsLost` (only from liquid).
     * 4. `applyHolderFlows`: optional liquid→young LTH / liquid→Ancient (positive), or bucket→liquid (negative); does not change treasuries/ETFs/lost.
     * Young LTH and Ancient are not in the netDemand path — institutions buy only from `liquid`.
     */
    const netDemand = strcBtc + otherBtc + etfBtc2 + buyBtcMExec - minerSales - sellBtcM;

    const liquidRatio = Math.max(liquid / initLiq, 0.03);
    const elasticity = p.baseElasticity / liquidRatio;
    const structuralRaw = (netDemand / Math.max(liquid, 50000)) * elasticity;
    const rawPct = structuralRaw + unmetPremiumMonthly;
    const halvingCycleAdj = getHalvingCycleMonthlyAdj(year, p.halvingNarrativeAmp, p.halvingImpactDecay);
    const cap = p.maxMonthlyPctGain / 100;
    const fund = Math.max(-0.2, Math.min(rawPct, cap));
    let pctChange = fund + halvingCycleAdj;

    const annualFrac = (p.initialAnnualVolatility ?? 0) / 100;
    const sigmaMonth = monthlySigmaFromAnnual(annualFrac);
    const reductionFrac = (p.volatilityReduction ?? 0) / 100;
    const volDecay = volatilityTimeDecayMultiplier(reductionFrac, m, months);
    const volShock = unitShockForMonth(m) * sigmaMonth * volDecay;
    pctChange += volShock;
    pctChange = Math.max(-0.6, Math.min(pctChange, cap));

    price = Math.max(price * (1 + pctChange), p.miningCostFloor);
    if (!isFinite(price)) price = data[data.length - 1]?.price ?? p.startPrice;

    // Structural demand drains liquid; losses move coins to lost forever.
    liquid = Math.max(liquid - netDemand - coinsLost, LIQ_FLOOR);
    treasury += strcBtc + otherBtc;
    etfBtc += etfBtc2;
    lostBtc += coinsLost;

    // Illiquid holder flows (after net demand for the month).
    const hf = applyHolderFlows(liquid, youngLthBtc, ancientBtc, p);
    liquid = hf.liquid;
    youngLthBtc = hf.youngLth;
    ancientBtc = hf.ancientBtc;

    const gm = (r) => 1 + r / 100 / MONTHS_PER_YEAR;
    const tYears = m / MONTHS_PER_YEAR;
    const rStrc = effectiveAnnualGrowthTapered({
      r0: p.strcGrowthRate,
      rInf: p.gdpGrowth,
      tYears,
      nYears: p.strcGrowthTaperYears ?? DEFAULT_TAPER_YEARS,
    });
    const rOther = effectiveAnnualGrowthTapered({
      r0: p.otherTreasuryGrowth,
      rInf: p.gdpGrowth,
      tYears,
      nYears: p.otherTreasuryGrowthTaperYears ?? DEFAULT_TAPER_YEARS,
    });
    const rEtf = effectiveAnnualGrowthTapered({
      r0: p.etfGrowthRate,
      rInf: p.gdpGrowth,
      tYears,
      nYears: p.etfGrowthTaperYears ?? DEFAULT_TAPER_YEARS,
    });
    strcUSD *= gm(rStrc);
    otherUSD *= gm(rOther);
    etfUSD *= gm(rEtf);
    buyBtcM *= gm(p.organicBuyGrowth) * (1 + gdpMonthlyBoost);
    sellBtcM *= 1 - p.organicSellDecline / 100 / MONTHS_PER_YEAR;
  }

  return { data, supplyShockYear };
}
