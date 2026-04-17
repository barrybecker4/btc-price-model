/** Map a fractional calendar year to a Date (inverse of getSimulationAnchorYear). */
export function decimalYearToDate(y) {
  const yi = Math.floor(y);
  const frac = Math.min(1, Math.max(0, y - yi));
  const start = new Date(yi, 0, 1);
  const next = new Date(yi + 1, 0, 1);
  return new Date(start.getTime() + frac * (next.getTime() - start.getTime()));
}

const SIM_RANGE_FMT = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** Human-readable sim window from fractional-year anchor and horizon (years). */
export function formatSimRangeLabel(anchorYear, simYears) {
  const a = decimalYearToDate(anchorYear);
  const b = decimalYearToDate(anchorYear + simYears);
  return `${SIM_RANGE_FMT.format(a)} – ${SIM_RANGE_FMT.format(b)}`;
}

/** USD short format: K, M, B, T, Q; ≥1,000Q shown as integer thousands of Q (e.g. $12,345Q). */
export function fmtUSD(v) {
  if (!isFinite(v)) return "—";
  if (v >= 1e18) return `$${Math.round(v / 1e15).toLocaleString()}Q`;
  if (v >= 1e15) return `$${(v / 1e15).toFixed(2)}Q`;
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${Math.round(v).toLocaleString()}`;
}
