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
  const startLabel = SIM_RANGE_FMT.format(a);
  const endLabel = SIM_RANGE_FMT.format(b);
  return startLabel + " – " + endLabel;
}

function fmtUsdQuadrillionsOrMore(v) {
  if (v >= 1e18) return `$${Math.round(v / 1e15).toLocaleString()}Q`;
  return `$${(v / 1e15).toFixed(2)}Q`;
}

function fmtUsdTrillions(v) {
  return `$${(v / 1e12).toFixed(2)}T`;
}

function fmtUsdBillions(v) {
  return `$${(v / 1e9).toFixed(2)}B`;
}

function fmtUsdMillions(v) {
  return `$${(v / 1e6).toFixed(2)}M`;
}

function fmtUsdThousands(v) {
  return `$${(v / 1e3).toFixed(0)}K`;
}

/** USD short format: K, M, B, T, Q; ≥1,000Q shown as integer thousands of Q (e.g. $12,345Q). */
export function fmtUSD(v) {
  if (!isFinite(v)) return "—";
  if (v >= 1e15) return fmtUsdQuadrillionsOrMore(v);
  if (v >= 1e12) return fmtUsdTrillions(v);
  if (v >= 1e9) return fmtUsdBillions(v);
  if (v >= 1e6) return fmtUsdMillions(v);
  if (v >= 1e3) return fmtUsdThousands(v);
  const rounded = Math.round(v);
  return `$${rounded.toLocaleString()}`;
}
