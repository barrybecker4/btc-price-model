import { describe, expect, it } from "vitest";
import { FIRST_HALVING_YEAR, HALVING_INTERVAL_YEARS } from "./halving.js";
import { getDailyMining } from "./mining.js";

describe("getDailyMining", () => {
  it("uses post-2024 reward until the first modeled halving year", () => {
    const pre = getDailyMining(FIRST_HALVING_YEAR - 0.01);
    expect(pre).toBe(144 * 3.125);
  });

  it("halves once per interval at and after FIRST_HALVING_YEAR", () => {
    const atFirst = getDailyMining(FIRST_HALVING_YEAR);
    expect(atFirst).toBe(144 * (3.125 / 2));

    const atSecond = getDailyMining(FIRST_HALVING_YEAR + HALVING_INTERVAL_YEARS);
    expect(atSecond).toBe(144 * (3.125 / 4));
  });
});
