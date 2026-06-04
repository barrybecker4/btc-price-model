/**
 * Nominal GDP growth from real GDP and inflation (additive identity).
 * @param {number} realGdpGrowthPct
 * @param {number} inflationPct
 * @returns {number}
 */
export function nominalGdpGrowthPct(realGdpGrowthPct, inflationPct) {
  return realGdpGrowthPct + inflationPct;
}
