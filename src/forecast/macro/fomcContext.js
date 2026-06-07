import fomcCalendar from "../data/fomcCalendar.json" with { type: "json" };
import fedPolicyContext from "../data/fedPolicyContext.json" with { type: "json" };
import { daysBetweenUtcDates, parseUtcDateMs, utcDateString } from "../features/dailyReturns.js";

const FOMC_WEEK_RADIUS_DAYS = 3;

/**
 * @returns {string[]}
 */
export function getFomcDecisionDates() {
  return fomcCalendar.decisionDates.slice();
}

/**
 * @returns {import("../forecastTypes.js").FedPolicySnapshot}
 */
export function getFedPolicySnapshot() {
  return { ...fedPolicyContext };
}

/**
 * @param {number} nowMs
 * @returns {boolean}
 */
export function isFomcWeek(nowMs = Date.now()) {
  const today = utcDateString(nowMs);
  const todayMs = parseUtcDateMs(today);
  for (const dateStr of getFomcDecisionDates()) {
    const decisionMs = parseUtcDateMs(dateStr);
    const delta = Math.abs(daysBetweenUtcDates(todayMs, decisionMs));
    if (delta <= FOMC_WEEK_RADIUS_DAYS) return true;
  }
  return false;
}

/**
 * @param {number} nowMs
 * @returns {{ days: number, date: string } | null}
 */
export function daysToNextFomcDecision(nowMs = Date.now()) {
  const today = utcDateString(nowMs);
  const todayMs = parseUtcDateMs(today);
  let best = null;
  for (const dateStr of getFomcDecisionDates()) {
    const decisionMs = parseUtcDateMs(dateStr);
    const days = daysBetweenUtcDates(todayMs, decisionMs);
    if (days < 0) continue;
    if (best == null || days < best.days) {
      best = { days, date: dateStr };
    }
  }
  return best;
}

/**
 * Signed stance for μ adjustment during FOMC week.
 * @param {import("../forecastTypes.js").FedStance} stance
 * @returns {number}
 */
export function fedStanceSign(stance) {
  if (stance === "dovish") return 1;
  if (stance === "hawkish") return -1;
  return 0;
}

/**
 * @param {number} [nowMs]
 * @returns {import("../forecastTypes.js").FomcMeetingContext}
 */
export function buildFomcContext(nowMs = Date.now()) {
  const policy = getFedPolicySnapshot();
  const next = daysToNextFomcDecision(nowMs);
  return {
    isFomcWeek: isFomcWeek(nowMs),
    daysToNextDecision: next?.days ?? null,
    nextDecisionDate: next?.date ?? null,
    policy,
  };
}
