import { afterEach, describe, expect, it, vi } from "vitest";
import { parseFearGreedResponse } from "./fetchFearGreed.js";

describe("fetchFearGreed", () => {
  it("parses alternative.me payload", () => {
    const points = parseFearGreedResponse({
      data: [
        { timestamp: "1700000000", value: "45", value_classification: "Fear" },
        { timestamp: "1700086400", value: "50", value_classification: "Neutral" },
      ],
    });
    expect(points).toHaveLength(2);
    expect(points[0].value).toBe(45);
    expect(points[1].classification).toBe("Neutral");
  });
});

describe("fetchForecastFeatureBundle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("aggregates partial failures into degradedFeatures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        if (String(url).includes("alternative.me")) {
          return { ok: false, status: 500, json: async () => ({}) };
        }
        if (String(url).includes("coingecko.com/api/v3/simple")) {
          return {
            ok: true,
            json: async () => ({ bitcoin: { usd: 95000 } }),
          };
        }
        if (String(url).includes("coingecko.com/api/v3/global")) {
          return {
            ok: true,
            json: async () => ({
              data: { market_cap_percentage: { btc: 55 }, market_cap_change_percentage_24h_usd: 1 },
            }),
          };
        }
        if (String(url).includes("histoday") || String(url).includes("cryptocompare")) {
          const t = Math.floor(Date.now() / 1000);
          return {
            ok: true,
            json: async () => ({
              Response: "Success",
              Data: { Data: [{ time: t - 86400, close: 94000 }, { time: t, close: 95000 }] },
            }),
          };
        }
        if (String(url).includes("s-and-p-500")) {
          return {
            ok: true,
            text: async () => "Date,SP500\n2020-01-01,3200\n2020-01-02,3250\n",
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      }),
    );

    const { fetchForecastFeatureBundle, __resetForecastFeatureCacheForTests } = await import(
      "./fetchForecastFeatureBundle.js"
    );
    const { __resetSpyDailyCacheForTests } = await import("./fetchSpyDailyCloses.js");
    __resetForecastFeatureCacheForTests();
    __resetSpyDailyCacheForTests();

    const bundle = await fetchForecastFeatureBundle({ bypassCache: true });
    expect(bundle.spotUsd).toBe(95000);
    expect(bundle.degradedFeatures).toContain("fearGreed");
  });
});
