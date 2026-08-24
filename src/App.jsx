import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ChartNotes } from "./components/ChartNotes.jsx";
import { FlowChart } from "./components/charts/FlowChart.jsx";
import { PriceChart } from "./components/charts/PriceChart.jsx";
import { ShortTermForecastTab } from "./components/charts/ShortTermForecastTab.jsx";
import { SupplyChart } from "./components/charts/SupplyChart.jsx";
import { KpiBar } from "./components/KpiBar.jsx";
import { ParameterSidebar } from "./components/ParameterSidebar.jsx";
import { runForecast } from "./forecast/runForecast.js";
import { DEFAULTS, withParamDefaults, YEAR_START } from "./sim/config/constants.js";
import { getEtfStressRedemptionYears } from "./sim/demand/etfStressRedemptions.js";
import { getHalvingYearsBetween, getHalvingYearsInRange } from "./sim/supply/halving.js";
import { runSim } from "./sim/runSim.js";
import { C, FONT_UI } from "./theme.js";
import { enrichHistoricalPriceRows, mergePriceChartHistoricalSim } from "./charts/priceChartMerge.js";
import { fetchBtcUsdHistoryRange } from "./data/market/index.js";
import { fetchBtcUsd } from "./data/market/fetchBtcUsd.js";
import { fetchSpyMonthlyHistory } from "./data/market/fetchSpyMonthlyHistory.js";
import {
  START_PRICE_SLIDER_BASE_MAX,
  START_PRICE_SLIDER_BASE_MIN,
  boundsForSpotPrice,
  miningCostFloorBounds,
} from "./params/startPriceSlider.js";
import { fractionalYearToLocalMs } from "./reference/powerLaw.js";
import { safeDivide } from "./utils/format.js";

const HISTORICAL_CHART_START_YEAR = 2011;
const HISTORICAL_CHART_END_YEAR = 2025;
const FROM_HISTORICAL_START_MS = Date.UTC(HISTORICAL_CHART_START_YEAR, 0, 1);

export default function App() {
  const [p, setP] = useState(DEFAULTS);
  const [startPriceSliderMin, setStartPriceSliderMin] = useState(START_PRICE_SLIDER_BASE_MIN);
  const [startPriceSliderMax, setStartPriceSliderMax] = useState(START_PRICE_SLIDER_BASE_MAX);
  const [tab, setTab] = useState("price");
  const [logScale, setLog] = useState(true);
  const [yAxisScale, setYAxisScale] = useState(1);
  const [overlayPowerLaw, setOverlayPowerLaw] = useState(false);
  const [overlaySpy, setOverlaySpy] = useState(false);
  const [spyBullishness, setSpyBullishness] = useState(0.5);
  const [showHistorical, setShowHistorical] = useState(false);
  const [historicalStartYear, setHistoricalStartYear] = useState(HISTORICAL_CHART_START_YEAR);
  const [historicalRaw, setHistoricalRaw] = useState(null);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [historicalError, setHistoricalError] = useState(null);
  const [spyHistoricalRaw, setSpyHistoricalRaw] = useState(null);
  const [spyHistoricalError, setSpyHistoricalError] = useState(null);
  const historicalFetchAttemptedRef = useRef(false);
  const spyHistoricalFetchAttemptedRef = useRef(false);
  const forecastAbortRef = useRef(null);
  const [forecastResult, setForecastResult] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState(null);
  const [forecastGeneratedAt, setForecastGeneratedAt] = useState(null);
  const [showContextRibbon, setShowContextRibbon] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      let spot;
      try {
        spot = await fetchBtcUsd(ac.signal);
      } catch (e) {
        if (e?.name === "AbortError" || ac.signal.aborted) return;
        return;
      }
      if (spot == null || ac.signal.aborted) return;
      const { min, max, value } = boundsForSpotPrice(spot);
      if (ac.signal.aborted) return;
      setStartPriceSliderMin(min);
      setStartPriceSliderMax(max);
      setP((prev) => {
        const { min: floorMin, max: floorMax } = miningCostFloorBounds(value);
        let mcf = prev.miningCostFloor;
        if (mcf < floorMin) mcf = floorMin;
        if (mcf > floorMax) mcf = floorMax;
        return { ...prev, startPrice: value, miningCostFloor: mcf };
      });
    })();
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (!showHistorical) {
      historicalFetchAttemptedRef.current = false;
      return;
    }
    if (historicalRaw != null) return;
    if (historicalFetchAttemptedRef.current) return;
    historicalFetchAttemptedRef.current = true;

    const ac = new AbortController();
    setHistoricalLoading(true);
    setHistoricalError(null);
    (async () => {
      try {
        const rows = await fetchBtcUsdHistoryRange({
          fromMs: FROM_HISTORICAL_START_MS,
          toMs: fractionalYearToLocalMs(YEAR_START),
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        if (!rows.length) {
          setHistoricalError("No historical data returned.");
          return;
        }
        setHistoricalRaw(rows);
      } catch (e) {
        if (!ac.signal.aborted) {
          setHistoricalError(e instanceof Error ? e.message : "Failed to load historical prices.");
        }
      } finally {
        if (!ac.signal.aborted) setHistoricalLoading(false);
      }
    })();
    return () => ac.abort();
  }, [showHistorical, historicalRaw]);

  useEffect(() => {
    if (!overlaySpy) setSpyHistoricalError(null);
  }, [overlaySpy]);

  useEffect(() => {
    if (!overlaySpy) {
      spyHistoricalFetchAttemptedRef.current = false;
      setSpyHistoricalError(null);
      setSpyHistoricalRaw(null);
      return;
    }
    if (spyHistoricalRaw != null) return;
    if (spyHistoricalFetchAttemptedRef.current) return;
    spyHistoricalFetchAttemptedRef.current = true;

    const ac = new AbortController();
    setSpyHistoricalError(null);
    (async () => {
      try {
        const rows = await fetchSpyMonthlyHistory({
          fromMs: FROM_HISTORICAL_START_MS,
          toMs: fractionalYearToLocalMs(YEAR_START),
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        if (!rows.length) {
          setSpyHistoricalError("No SPY / S&P history returned for this range.");
          return;
        }
        setSpyHistoricalRaw(rows);
      } catch (e) {
        if (!ac.signal.aborted) {
          setSpyHistoricalError(e instanceof Error ? e.message : "Failed to load SPY history.");
        }
      }
    })();
    return () => ac.abort();
  }, [overlaySpy, spyHistoricalRaw]);

  const sidebarParams = useMemo(() => withParamDefaults(p), [p]);
  const deferredP = useDeferredValue(p);
  const simParams = useMemo(() => withParamDefaults(deferredP), [deferredP]);

  const { data, supplyShockYear } = useMemo(() => runSim(simParams), [simParams]);
  const cd = useMemo(() => data.filter((_, i) => i % 3 === 0), [data]);

  /** When the cap never binds, on/off runs match — surface that so the toggle doesn’t look “broken”. */
  const floatCapInfo = useMemo(() => {
    const capOn = simParams.capBuyingToLiquidFloat !== false;
    if (!capOn) return { mode: "off" };
    const maxRationPct = Math.max(0, ...data.map((d) => d.buyRationPct));
    const boundMonths = data.filter((d) => d.buyRationPct > 0.01).length;
    return { mode: "on", boundMonths, totalMonths: data.length, maxRationPct };
  }, [data, simParams.capBuyingToLiquidFloat]);
  const first = data[0];
  const last = data[data.length - 1];
  const mult = safeDivide(last?.price, first?.price, NaN);

  const historicalEnriched = useMemo(() => {
    if (!historicalRaw?.length) return null;
    const enriched = enrichHistoricalPriceRows(historicalRaw, YEAR_START);
    if (historicalStartYear <= HISTORICAL_CHART_START_YEAR) return enriched;
    return enriched.filter((row) => row.year >= historicalStartYear);
  }, [historicalRaw, historicalStartYear]);

  const priceChartData = useMemo(() => {
    if (!showHistorical || !historicalEnriched?.length) return cd;
    return mergePriceChartHistoricalSim(historicalEnriched, cd, YEAR_START);
  }, [showHistorical, historicalEnriched, cd]);

  const chartFirstRow = priceChartData[0] ?? first;

  const simEndYear = YEAR_START + simParams.simYears;
  const halvingsPrice = useMemo(() => {
    if (showHistorical && historicalEnriched?.length) {
      return getHalvingYearsBetween(historicalStartYear, simEndYear);
    }
    return getHalvingYearsInRange(YEAR_START, simParams.simYears);
  }, [showHistorical, historicalEnriched, historicalStartYear, simEndYear, simParams.simYears]);

  const halvingsSim = useMemo(() => getHalvingYearsInRange(YEAR_START, simParams.simYears), [simParams.simYears]);
  const etfStressYears = useMemo(
    () => getEtfStressRedemptionYears(YEAR_START, simParams.simYears, simParams.etfStressRedemptionCount),
    [simParams.simYears, simParams.etfStressRedemptionCount]
  );

  const forecastSimContext = useMemo(
    () => ({
      spotPrice: forecastResult?.spotUsd ?? first?.price ?? 0,
      simFirstRow: first,
      simRows: data,
      yearStart: YEAR_START,
    }),
    [forecastResult?.spotUsd, first, data]
  );

  const handleGenerateForecast = useCallback(() => {
    forecastAbortRef.current?.abort();
    const ac = new AbortController();
    forecastAbortRef.current = ac;
    setForecastLoading(true);
    setForecastError(null);
    (async () => {
      try {
        const result = await runForecast({
          signal: ac.signal,
          bypassCache: true,
          includeContextRibbon: showContextRibbon,
          simContext: forecastSimContext,
        });
        if (ac.signal.aborted) return;
        setForecastResult(result);
        setForecastGeneratedAt(result.generatedAtMs);
      } catch (e) {
        if (!ac.signal.aborted) {
          setForecastError(e instanceof Error ? e.message : "Forecast failed.");
        }
      } finally {
        if (!ac.signal.aborted) setForecastLoading(false);
      }
    })();
  }, [showContextRibbon, forecastSimContext]);

  const tabBtn = (key, lbl) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      style={{
        padding: "5px 14px",
        background: tab === key ? C.amber : "transparent",
        border: `1px solid ${tab === key ? C.amber : C.border}`,
        borderRadius: 2,
        cursor: "pointer",
        color: tab === key ? "#000" : C.dim,
        fontSize: 11,
        fontFamily: FONT_UI,
        fontWeight: tab === key ? 700 : 400,
        letterSpacing: "0.06em",
      }}
    >
      {lbl}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: FONT_UI,
        overflow: "hidden",
      }}
    >
      <ParameterSidebar
        p={sidebarParams}
        setP={setP}
        startPriceMin={startPriceSliderMin}
        startPriceMax={startPriceSliderMax}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <KpiBar p={simParams} last={last} supplyShockYear={supplyShockYear} mult={mult} floatCapInfo={floatCapInfo} />

        <div style={{ flex: 1, minHeight: 0, padding: "14px 20px", overflow: "auto" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, alignItems: "center" }}>
            {tabBtn("price", "PRICE CHART")}
            {tabBtn("supply", "SUPPLY BREAKDOWN")}
            {tabBtn("flow", "DAILY FLOW")}
            {tabBtn("forecast", "SHORT-TERM FORECAST")}
            {tab === "price" && (
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
                <label
                  style={{
                    fontSize: 11,
                    color: C.dim,
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    cursor: "pointer",
                  }}
                >
                  <input type="checkbox" checked={logScale} onChange={(e) => setLog(e.target.checked)} style={{ accentColor: C.amber }} />
                  LOG SCALE (BTC & SPY)
                </label>
                <label
                  style={{
                    fontSize: 11,
                    color: C.dim,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: FONT_UI,
                  }}
                >
                  Y SCALE
                  <input
                    type="range"
                    min="1"
                    max="40"
                    step="0.1"
                    value={yAxisScale}
                    onChange={(e) => setYAxisScale(Number(e.target.value))}
                    style={{ accentColor: C.amber, width: 140, cursor: "ew-resize" }}
                  />
                  <span style={{ minWidth: 34, textAlign: "right", color: C.hint }}>{yAxisScale.toFixed(2)}x</span>
                </label>
              </div>
            )}
          </div>

          {tab === "price" && (
            <PriceChart
              data={priceChartData}
              first={chartFirstRow}
              inflation={simParams.inflation}
              realGdpGrowth={simParams.realGdpGrowth}
              logScale={logScale}
              yAxisScale={yAxisScale}
              halvings={halvingsPrice}
              etfStressYears={etfStressYears}
              supplyShockYear={supplyShockYear}
              overlayPowerLaw={overlayPowerLaw}
              onOverlayPowerLawChange={setOverlayPowerLaw}
              overlaySpy={overlaySpy}
              onOverlaySpyChange={setOverlaySpy}
              spyHistoricalPoints={spyHistoricalRaw}
              spyBullishness={spyBullishness}
              onSpyBullishnessChange={setSpyBullishness}
              showHistorical={showHistorical}
              onShowHistoricalChange={(v) => {
                setShowHistorical(v);
                if (!v) {
                  setHistoricalError(null);
                }
              }}
              historicalStartYear={historicalStartYear}
              historicalStartYearMin={HISTORICAL_CHART_START_YEAR}
              historicalStartYearMax={HISTORICAL_CHART_END_YEAR}
              onHistoricalStartYearChange={setHistoricalStartYear}
              showProjectionStartLine={showHistorical && !!historicalEnriched?.length}
              historicalLoading={historicalLoading}
              historicalError={historicalError}
              spyHistoricalError={spyHistoricalError}
            />
          )}
          {tab === "supply" && (
            <SupplyChart
              data={cd}
              halvings={halvingsSim}
              etfStressYears={etfStressYears}
              supplyShockYear={supplyShockYear}
            />
          )}
          {tab === "flow" && (
            <FlowChart
              data={cd}
              halvings={halvingsSim}
              etfStressYears={etfStressYears}
              supplyShockYear={supplyShockYear}
            />
          )}
          {tab === "forecast" && (
            <ShortTermForecastTab
              result={forecastResult}
              loading={forecastLoading}
              error={forecastError}
              generatedAtMs={forecastGeneratedAt}
              showContextRibbon={showContextRibbon}
              onShowContextRibbonChange={setShowContextRibbon}
              simContext={forecastSimContext}
              onGenerate={handleGenerateForecast}
            />
          )}

          {tab !== "forecast" && <ChartNotes />}
        </div>
      </div>
    </div>
  );
}
