/** Clamp supported ETF stress redemption event count to the UI range. */
export function getEtfStressRedemptionCount(value) {
  return Math.max(0, Math.min(3, Math.round(value ?? 1)));
}

/**
 * Months where ETF stress redemption events occur, spaced across the simulation.
 * At most `months - 1` distinct months exist (indices 1 … months-1); if the UI requests more
 * events than fit, the count is clamped so each event maps to a unique month.
 */
export function getEtfStressRedemptionMonths(totalMonths, countValue) {
  const count = getEtfStressRedemptionCount(countValue);
  const months = Math.max(0, totalMonths ?? 0);
  if (count === 0 || months <= 1) return [];
  const maxSlots = months - 1;
  const n = Math.min(count, maxSlots);
  if (n === 0) return [];
  if (n === 1) {
    return [Math.max(1, Math.min(maxSlots, Math.round(months / 2)))];
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(Math.max(1, Math.min(maxSlots, Math.round(((i + 1) * months) / (n + 1)))));
  }
  out.sort((a, b) => a - b);
  for (let j = 1; j < out.length; j++) {
    if (out[j] <= out[j - 1]) out[j] = Math.min(maxSlots, out[j - 1] + 1);
  }
  return out;
}

/** Fractional calendar years where ETF stress redemption events occur. */
export function getEtfStressRedemptionYears(startYear, simYears, countValue) {
  const totalMonths = Math.max(0, Math.round((simYears ?? 0) * 12));
  return getEtfStressRedemptionMonths(totalMonths, countValue).map((month) => startYear + month / 12);
}
