import { useEffect, useMemo, useRef, useState } from "react";
import { ChartNotes } from "./components/ChartNotes.jsx";
import { FlowChart } from "./components/charts/FlowChart.jsx";
import { PriceChart } from "./components/charts/PriceChart.jsx";
import { SupplyChart } from "./components/charts/SupplyChart.jsx";
import { KpiBar } from "./components/KpiBar.jsx";
import { ParameterSidebar } from "./components/ParameterSidebar.jsx";
import { DEFAULTS, withParamDefaults, YEAR_START } from "./sim/constants.js";
import { getEtfStressRedemptionYears } from "./sim/etfStressRedemptions.js";
import { getHalvingYearsBetween, getHalvingYearsInRange } from "./sim/halving.js";
import { runSim } from "./sim/runSim.js";
import { C, FONT_UI } from "./theme.js";
import { fetchBtcUsdHistoryRange } from "./utils/fetchBtcHistory.js";
import { fetchBtcUsd } from "./utils/fetchBtcUsd.js";
import { enrichHistoricalPriceRows, mergePriceChartHistoricalSim } from "./utils/priceChartMerge.js";
import { fractionalYearToLocalMs } from "./utils/powerLaw.js";
import {
  START_PRICE_SLIDER_BASE_MAX,
  START_PRICE_SLIDER_BASE_MIN,
  boundsForSpotPrice,
  miningCostFloorBounds,
} from "./utils/startPriceSlider.js";

const HISTORICAL_CHART_START_YEAR = 2011;
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
  const [historicalRaw, setHistoricalRaw] = useState(null);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [historicalError, setHistoricalError] = useState(null);
  const historicalFetchAttemptedRef = useRef(false);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      const spot = await fetchBtcUsd(ac.signal);
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

  const params = useMemo(() => withParamDefaults(p), [p]);

  const { data, supplyShockYear } = useMemo(() => runSim(params), [params]);
  const cd = useMemo(() => data.filter((_, i) => i % 3 === 0), [data]);

  /** When the cap never binds, on/off runs match — surface that so the toggle doesn’t look “broken”. */
  const floatCapInfo = useMemo(() => {
    const capOn = params.capBuyingToLiquidFloat !== false;
    if (!capOn) return { mode: "off" };
    const maxRationPct = Math.max(0, ...data.map((d) => d.buyRationPct));
    const boundMonths = data.filter((d) => d.buyRationPct > 0.01).length;
    return { mode: "on", boundMonths, totalMonths: data.length, maxRationPct };
  }, [data, params.capBuyingToLiquidFloat]);
  const first = data[0];
  const last = data[data.length - 1];
  const mult = last.price / first.price;

  const historicalEnriched = useMemo(() => {
    if (!historicalRaw?.length) return null;
    return enrichHistoricalPriceRows(historicalRaw, YEAR_START);
  }, [historicalRaw]);

  const priceChartData = useMemo(() => {
    if (!showHistorical || !historicalEnriched?.length) return cd;
    return mergePriceChartHistoricalSim(historicalEnriched, cd, YEAR_START);
  }, [showHistorical, historicalEnriched, cd]);

  const chartFirstRow = priceChartData[0] ?? first;

  const simEndYear = YEAR_START + params.simYears;
  const halvingsPrice = useMemo(() => {
    if (showHistorical && historicalEnriched?.length) {
      return getHalvingYearsBetween(HISTORICAL_CHART_START_YEAR, simEndYear);
    }
    return getHalvingYearsInRange(YEAR_START, params.simYears);
  }, [showHistorical, historicalEnriched, simEndYear, params.simYears]);

  const halvingsSim = useMemo(() => getHalvingYearsInRange(YEAR_START, params.simYears), [params.simYears]);
  const etfStressYears = useMemo(
    () => getEtfStressRedemptionYears(YEAR_START, params.simYears, params.etfStressRedemptionCount),
    [params.simYears, params.etfStressRedemptionCount]
  );

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
        p={params}
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
        <KpiBar p={params} last={last} supplyShockYear={supplyShockYear} mult={mult} floatCapInfo={floatCapInfo} />

        <div style={{ flex: 1, minHeight: 0, padding: "14px 20px", overflow: "auto" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, alignItems: "center" }}>
            {tabBtn("price", "PRICE CHART")}
            {tabBtn("supply", "SUPPLY BREAKDOWN")}
            {tabBtn("flow", "DAILY FLOW")}
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
              inflation={params.inflation}
              gdpGrowth={params.gdpGrowth}
              logScale={logScale}
              yAxisScale={yAxisScale}
              halvings={halvingsPrice}
              etfStressYears={etfStressYears}
              supplyShockYear={supplyShockYear}
              overlayPowerLaw={overlayPowerLaw}
              onOverlayPowerLawChange={setOverlayPowerLaw}
              overlaySpy={overlaySpy}
              onOverlaySpyChange={setOverlaySpy}
              spyBullishness={spyBullishness}
              onSpyBullishnessChange={setSpyBullishness}
              showHistorical={showHistorical}
              onShowHistoricalChange={(v) => {
                setShowHistorical(v);
                if (!v) setHistoricalError(null);
              }}
              showProjectionStartLine={showHistorical && !!historicalEnriched?.length}
              historicalLoading={historicalLoading}
              historicalError={historicalError}
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

          <ChartNotes />
        </div>
      </div>
    </div>
  );
}
