/**
 * @param {unknown} value
 * @returns {number | null} finite positive USD amount, or null
 */
export function parsePositiveUsdNumber(value) {
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;
  return n;
}
