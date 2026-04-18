/**
 * Keep one sample per calendar month (UTC); last daily point in each month wins.
 * @param {{ timestampMs: number, price: number }[]} points
 * @returns {{ timestampMs: number, price: number }[]}
 */
export function downsampleToMonthly(points) {
  if (!points.length) return [];
  const sorted = [...points].sort((a, b) => a.timestampMs - b.timestampMs);
  const byMonth = new Map();
  for (const point of sorted) {
    const date = new Date(point.timestampMs);
    const key = date.getUTCFullYear() * 12 + date.getUTCMonth();
    byMonth.set(key, point);
  }
  return Array.from(byMonth.values()).sort((a, b) => a.timestampMs - b.timestampMs);
}
