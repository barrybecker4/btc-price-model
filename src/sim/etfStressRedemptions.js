/** Clamp supported ETF stress redemption event count to the UI range. */
export function getEtfStressRedemptionCount(value) {
  return Math.max(0, Math.min(3, Math.round(value ?? 1)));
}

/** Months where ETF stress redemption events occur, spaced across the simulation. */
export function getEtfStressRedemptionMonths(totalMonths, countValue) {
  const count = getEtfStressRedemptionCount(countValue);
  const months = Math.max(0, totalMonths ?? 0);
  if (count === 0 || months <= 1) return [];
  return Array.from({ length: count }, (_, i) =>
    Math.max(1, Math.min(months - 1, Math.round(((i + 1) * months) / (count + 1))))
  );
}

/** Fractional calendar years where ETF stress redemption events occur. */
export function getEtfStressRedemptionYears(startYear, simYears, countValue) {
  const totalMonths = Math.max(0, Math.round((simYears ?? 0) * 12));
  return getEtfStressRedemptionMonths(totalMonths, countValue).map((month) => startYear + month / 12);
}
