import { describe, expect, it } from "vitest";
import { nominalGdpGrowthPct } from "./nominalGdp.js";

describe("nominalGdpGrowthPct", () => {
  it("adds real GDP and inflation", () => {
    expect(nominalGdpGrowthPct(2, 3)).toBe(5);
  });

  it("allows negative real with positive inflation", () => {
    expect(nominalGdpGrowthPct(-5, 15)).toBe(10);
  });
});
