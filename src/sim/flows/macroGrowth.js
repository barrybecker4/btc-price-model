/**
 * Terminal growth (rInf) for logistic USD-flow tapers — AI uplift biased toward scarce-asset channels.
 * @param {number} gdpGrowthPct nominal GDP %/yr
 * @param {number} aiProductivityPct AI productivity uplift %/yr
 */
export function institutionalTerminalGdp(gdpGrowthPct, aiProductivityPct) {
  return gdpGrowthPct;
}

export function retailTerminalGdp(gdpGrowthPct, aiProductivityPct) {
  return gdpGrowthPct + (aiProductivityPct ?? 0);
}

export function etfTerminalGdp(gdpGrowthPct, aiProductivityPct) {
  return gdpGrowthPct + (aiProductivityPct ?? 0) * 0.5;
}
