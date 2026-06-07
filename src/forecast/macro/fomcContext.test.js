import { describe, expect, it } from "vitest";
import {
  buildFomcContext,
  daysToNextFomcDecision,
  fedStanceSign,
  isFomcWeek,
} from "../macro/fomcContext.js";
import { parseUtcDateMs } from "../features/dailyReturns.js";

const MS_PER_DAY = 86400000;

describe("fomcContext", () => {
  it("detects FOMC week within ±3 days of decision", () => {
    const decisionMs = parseUtcDateMs("2025-06-18");
    expect(isFomcWeek(decisionMs)).toBe(true);
    expect(isFomcWeek(decisionMs - 3 * 86400000)).toBe(true);
    expect(isFomcWeek(decisionMs - 10 * 86400000)).toBe(false);
  });

  it("returns days to next decision", () => {
    const before = parseUtcDateMs("2025-06-10");
    const next = daysToNextFomcDecision(before);
    expect(next).not.toBeNull();
    expect(next?.date).toBe("2025-06-18");
    expect(next?.days).toBe(8);
  });

  it("maps fed stance sign", () => {
    expect(fedStanceSign("dovish")).toBe(1);
    expect(fedStanceSign("hawkish")).toBe(-1);
    expect(fedStanceSign("neutral")).toBe(0);
  });

  it("builds fomc context with policy snapshot", () => {
    const ctx = buildFomcContext(parseUtcDateMs("2025-06-17"));
    expect(ctx.policy.fundsRateUpper).toBeGreaterThan(0);
    expect(typeof ctx.isFomcWeek).toBe("boolean");
  });
});
