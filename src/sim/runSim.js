import { YEAR_START } from "./constants.js";
import { getDailyMining } from "./mining.js";

export function runSim(p) {
  const months = p.simYears * 12;
  const safeLost = Math.min(p.alreadyLostCoins, p.circulatingSupply * 0.9);

  let price = p.startPrice;
  let lostBtc = safeLost;
  let treasury = p.strcInitialBtc + p.otherInitialBtc;
  let etfBtc = p.etfInitialBtc;
  let liquid = Math.max(p.circulatingSupply - lostBtc - treasury - etfBtc, 200000);
  const initLiq = liquid;

  let strcUSD = (p.strcInitialUsdB * 1e9) / 12;
  let otherUSD = (p.otherTreasuryUsdB * 1e9) / 12;
  let etfUSD = p.etfDailyInflowM * 1e6 * 30;
  let buyBtcM = p.organicDailyBuy * 30;
  let sellBtcM = p.organicDailySell * 30;

  const gdpMonthlyBoost = p.gdpGrowth / 100 / 12;

  const data = [];
  let supplyShockYear = null;

  for (let m = 0; m <= months; m++) {
    const year = YEAR_START + m / 12;
    const dailyMining = getDailyMining(year);
    const liquidPct = (liquid / initLiq) * 100;
    if (liquidPct < 30 && !supplyShockYear) supplyShockYear = year;

    const strcDayBtc = strcUSD / price / 30;
    const otherDayBtc = otherUSD / price / 30;
    const etfDayBtc = etfUSD / price / 30;
    const minerSellDay = dailyMining * (p.minerSellPct / 100);
    const totalBuyDay = strcDayBtc + otherDayBtc + etfDayBtc + buyBtcM / 30;
    const totalSellDay = minerSellDay + sellBtcM / 30;

    data.push({
      year: parseFloat(year.toFixed(3)),
      price: Math.round(price),
      priceReal: Math.round(price / Math.pow(1 + p.inflation / 100, m / 12)),
      liquidM: parseFloat((liquid / 1e6).toFixed(3)),
      treasuryM: parseFloat((treasury / 1e6).toFixed(3)),
      etfM: parseFloat((etfBtc / 1e6).toFixed(3)),
      lostM: parseFloat((lostBtc / 1e6).toFixed(3)),
      liquidPct: parseFloat(liquidPct.toFixed(1)),
      strcDayBtc: parseFloat(strcDayBtc.toFixed(0)),
      etfDayBtc: parseFloat(etfDayBtc.toFixed(0)),
      otherDayBtc: parseFloat(otherDayBtc.toFixed(0)),
      dailyMining: parseFloat(dailyMining.toFixed(1)),
      totalBuyDay: parseFloat(totalBuyDay.toFixed(0)),
      totalSellDay: parseFloat(totalSellDay.toFixed(0)),
      netDayDemand: parseFloat((totalBuyDay - totalSellDay).toFixed(0)),
    });

    if (m === months) break;

    const dailyMiningM = dailyMining * 30;
    const minerSales = dailyMiningM * (p.minerSellPct / 100);
    const coinsLost = liquid * (p.annualLossRate / 100 / 12);
    const strcBtc = strcUSD / price;
    const otherBtc = otherUSD / price;
    const etfBtc2 = etfUSD / price;
    const netDemand = strcBtc + otherBtc + etfBtc2 + buyBtcM - minerSales - sellBtcM;

    const liquidRatio = Math.max(liquid / initLiq, 0.03);
    const elasticity = p.baseElasticity / liquidRatio;
    const rawPct = (netDemand / Math.max(liquid, 50000)) * elasticity;
    const cap = p.maxMonthlyPctGain / 100;
    const pctChange = Math.max(-0.2, Math.min(rawPct, cap));

    price = Math.max(price * (1 + pctChange), p.miningCostFloor);
    if (!isFinite(price)) price = data[data.length - 1]?.price ?? p.startPrice;

    liquid = Math.max(liquid - netDemand - coinsLost, 50000);
    treasury += strcBtc + otherBtc;
    etfBtc += etfBtc2;
    lostBtc += coinsLost;

    const gm = (r) => 1 + r / 100 / 12;
    strcUSD *= gm(p.strcGrowthRate) * (1 + gdpMonthlyBoost);
    otherUSD *= gm(p.otherTreasuryGrowth) * (1 + gdpMonthlyBoost);
    etfUSD *= gm(p.etfGrowthRate) * (1 + gdpMonthlyBoost);
    buyBtcM *= gm(p.organicBuyGrowth) * (1 + gdpMonthlyBoost);
    sellBtcM *= 1 - p.organicSellDecline / 100 / 12;
  }

  return { data, supplyShockYear };
}
