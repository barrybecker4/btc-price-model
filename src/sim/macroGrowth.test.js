import { describe, expect, it } from "vitest";
import {
  etfTerminalGdp,
  institutionalTerminalGdp,
  retailTerminalGdp,
} from "./macroGrowth.js";

describe("macroGrowth terminal GDP helpers", () => {
  it("institutional terminal ignores AI uplift", () => {
    expect(institutionalTerminalGdp(4, 2)).toBe(4);
  });

  it("retail terminal adds full AI uplift", () => {
    expect(retailTerminalGdp(4, 2)).toBe(6);
  });

  it("etf terminal adds half AI uplift", () => {
    expect(etfTerminalGdp(4, 2)).toBe(5);
  });
});
