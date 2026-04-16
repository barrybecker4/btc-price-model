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
