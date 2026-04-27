import { DEFAULTS, MONTHS_PER_YEAR, YEAR_START } from "./constants.js";
import {
  applyHolderFlows,
  initialHolderSplit,
  LIQ_FLOOR,
  rebalanceLiquidToFloor,
} from "./holderBuckets.js";
import { getDailyMining } from "./mining.js";
import { computeMonthlyDemandFromUsd } from "./monthlyDemandFromUsd.js";
import { computePriceAfterMonthTransition } from "./monthlyPriceStep.js";
import { buildSimulationRow } from "./simulationRow.js";
import { advanceUsdFlowsForMonth } from "./usdFlowGrowth.js";

export { applyHolderFlows, initialHolderSplit, LIQ_FLOOR, rebalanceLiquidToFloor } from "./holderBuckets.js";

/**
 * @param {import("./simTypes.js").SimParams} parameters
 */
export function runSim(parameters) {
  const months = parameters.simYears * MONTHS_PER_YEAR;
  const safeLost = Math.min(parameters.alreadyLostCoins, parameters.circulatingSupply * 0.9);

  let price = parameters.startPrice;
  let lostBtc = safeLost;
  let treasury = parameters.strcInitialBtc + parameters.otherInitialBtc;
  let etfBtc = parameters.etfInitialBtc;

  const available0 = Math.max(parameters.circulatingSupply - lostBtc - treasury - etfBtc, 0);
  const split = initialHolderSplit(
    available0,
    parameters.lth155SharePct ?? DEFAULTS.lth155SharePct,
    parameters.ancientSharePct ?? DEFAULTS.ancientSharePct
  );
  const rebalanced = rebalanceLiquidToFloor(split.liquid, split.youngLth, split.ancientBtc, LIQ_FLOOR);
  let liquid = rebalanced.liquid;
  let youngLthBtc = rebalanced.youngLth;
  let ancientBtc = rebalanced.ancientBtc;

  const initialLiquid = liquid;
  if (initialLiquid <= 0) {
    throw new Error(
      "runSim: initial liquid after rebalance must be positive; increase circulating supply or reduce lost/treasury/ETF allocation."
    );
  }

  let strcUSD = (parameters.strcInitialUsdB * 1e9) / MONTHS_PER_YEAR;
  let otherUSD = (parameters.otherTreasuryUsdB * 1e9) / MONTHS_PER_YEAR;
  let etfUSD = parameters.etfDailyInflowM * 1e6 * 30;
  let retailNetUsd = (parameters.initialRetailPurchaseRateM ?? 0) * 1e6 * 30;

  const data = [];
  /** Month-end closes for trailing 52-week (12-month) average in LTH profit distribution. */
  const monthEndCloses = [];
  let supplyShockYear = null;
  let momentumReturn = 0;

  for (let monthIndex = 0; monthIndex <= months; monthIndex++) {
    const year = YEAR_START + monthIndex / MONTHS_PER_YEAR;
    const dailyMining = getDailyMining(year);
    const liquidPercentOfInitial = (liquid / initialLiquid) * 100;
    if (liquidPercentOfInitial < 30 && supplyShockYear === null) supplyShockYear = year;

    let valuationMa52w;
    if (monthEndCloses.length > 0) {
      const wv = Math.min(MONTHS_PER_YEAR, monthEndCloses.length);
      let vSum = 0;
      for (let i = monthEndCloses.length - wv; i < monthEndCloses.length; i++) {
        vSum += monthEndCloses[i];
      }
      valuationMa52w = vSum / wv;
    }

    const demand = computeMonthlyDemandFromUsd({
      price,
      liquid,
      strcUSD,
      otherUSD,
      etfUSD,
      retailNetUsd,
      dailyMining,
      monthIndex,
      totalMonths: months,
      treasury,
      etfBtc,
      momentumReturn,
      parameters,
      ...(valuationMa52w !== undefined ? { priceMa52w: valuationMa52w } : {}),
    });

    const row = buildSimulationRow({
      year,
      price,
      inflationPercent: parameters.inflation,
      monthIndex,
      liquid,
      treasury,
      etfBtc,
      lostBtc,
      youngLthBtc,
      ancientBtc,
      liquidPercentOfInitial,
      demand,
      dailyMining,
    });
    data.push(row);

    if (monthIndex === months) break;

    const netDemand =
      demand.strcBtc +
      demand.otherBtc +
      demand.etfBtc2 +
      demand.organicRetailNetBtcExecuted -
      demand.minerSales;

    const priorPrice = price;
    const nextPrice = computePriceAfterMonthTransition({
      price: priorPrice,
      liquid,
      initLiq: initialLiquid,
      netDemand,
      unmetDemandPremiumMonthly: demand.unmetDemandPremiumMonthly,
      year,
      monthIndex,
      totalMonths: months,
      parameters,
    });
    const realizedReturn = nextPrice / priorPrice - 1;
    const decayMonths = Math.max(1, parameters.momentumDecayMonths ?? DEFAULTS.momentumDecayMonths);
    const momentumAlpha = 2 / (decayMonths + 1);
    momentumReturn = momentumReturn * (1 - momentumAlpha) + realizedReturn * momentumAlpha;
    price = nextPrice;

    monthEndCloses.push(price);
    const w = Math.min(MONTHS_PER_YEAR, monthEndCloses.length);
    let maSum = 0;
    for (let i = monthEndCloses.length - w; i < monthEndCloses.length; i++) {
      maSum += monthEndCloses[i];
    }
    const ma52w = maSum / w;

    liquid = Math.max(liquid - netDemand - demand.coinsLost, LIQ_FLOOR);
    treasury += demand.strcBtc + demand.otherBtc;
    etfBtc = Math.max(0, etfBtc + demand.etfBtc2);
    lostBtc += demand.coinsLost;

    const holderFlows = applyHolderFlows(liquid, youngLthBtc, ancientBtc, parameters, price, ma52w);
    liquid = holderFlows.liquid;
    youngLthBtc = holderFlows.youngLth;
    ancientBtc = holderFlows.ancientBtc;

    const usdFlows = advanceUsdFlowsForMonth({
      strcUSD,
      otherUSD,
      etfUSD,
      retailNetUsd,
      monthIndex,
      parameters,
    });
    strcUSD = usdFlows.strcUSD;
    otherUSD = usdFlows.otherUSD;
    etfUSD = usdFlows.etfUSD;
    retailNetUsd = usdFlows.retailNetUsd;
  }

  return { data, supplyShockYear };
}
