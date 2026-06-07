const MS_PER_DAY = 86400000;
const TRADING_DAYS_PER_YEAR = 252;

/**
 * @param {import("../forecastTypes.js").DailyClosePoint[]} points
 * @returns {import("../forecastTypes.js").DailyClosePoint[]}
 */
export function sortDailyCloses(points) {
  return [...points].sort((a, b) => a.timestampMs - b.timestampMs);
}

/**
 * @param {import("../forecastTypes.js").DailyClosePoint[]} sorted
 * @returns {number[]}
 */
export function logReturnsFromCloses(sorted) {
  const returns = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].price;
    const curr = sorted[i].price;
    if (prev > 0 && curr > 0) returns.push(Math.log(curr / prev));
  }
  return returns;
}

/**
 * Cumulative log return over the last `days` daily samples.
 * @param {import("../forecastTypes.js").DailyClosePoint[]} points
 * @param {number} days
 * @returns {number}
 */
export function trailingLogReturn(points, days) {
  const sorted = sortDailyCloses(points);
  if (sorted.length < 2) return 0;
  const take = Math.min(days + 1, sorted.length);
  const slice = sorted.slice(sorted.length - take);
  if (slice.length < 2) return 0;
  const start = slice[0].price;
  const end = slice[slice.length - 1].price;
  if (start <= 0 || end <= 0) return 0;
  return Math.log(end / start);
}

/**
 * Annualized realized volatility from the last `windowDays` log returns.
 * @param {import("../forecastTypes.js").DailyClosePoint[]} points
 * @param {number} windowDays
 * @returns {number}
 */
export function trailingRealizedVolAnnual(points, windowDays) {
  const sorted = sortDailyCloses(points);
  const returns = logReturnsFromCloses(sorted);
  if (returns.length < 2) return 0.5;
  const window = returns.slice(-Math.min(windowDays, returns.length));
  if (window.length < 2) return 0.5;
  const mean = window.reduce((a, b) => a + b, 0) / window.length;
  const variance = window.reduce((s, r) => s + (r - mean) ** 2, 0) / (window.length - 1);
  return Math.sqrt(Math.max(0, variance)) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

/**
 * @param {import("../forecastTypes.js").DailyClosePoint[]} points
 * @param {number} daysAgo
 * @returns {number | null}
 */
export function dominanceOrPriceAtLag(points, daysAgo) {
  const sorted = sortDailyCloses(points);
  if (sorted.length <= daysAgo) return null;
  return sorted[sorted.length - 1 - daysAgo].price;
}

/**
 * @param {number} timestampMs
 * @returns {string}
 */
export function utcDateString(timestampMs) {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

/**
 * @param {string} dateStr YYYY-MM-DD
 * @returns {number}
 */
export function parseUtcDateMs(dateStr) {
  return Date.parse(`${dateStr}T12:00:00Z`);
}

/**
 * @param {number} ms
 * @returns {number}
 */
export function daysBetweenUtcDates(fromMs, toMs) {
  return Math.round((toMs - fromMs) / MS_PER_DAY);
}

export { MS_PER_DAY, TRADING_DAYS_PER_YEAR };
