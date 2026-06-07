import { useState } from "react";
import { buildContextRibbon } from "../../forecast/context/buildContextRibbon.js";
import { C, FONT_NUM, FONT_UI } from "../../theme.js";
import { fmtUSD } from "../../utils/format.js";
import { ForecastDistributionChart } from "./ForecastDistributionChart.jsx";
import { KPI } from "../KPI.jsx";

/**
 * @param {{
 *   result: import("../../forecast/forecastTypes.js").ForecastResult | null,
 *   loading: boolean,
 *   error: string | null,
 *   generatedAtMs: number | null,
 *   showContextRibbon: boolean,
 *   onShowContextRibbonChange: (v: boolean) => void,
 *   simContext: import("../../forecast/forecastTypes.js").SimContext,
 *   onGenerate: () => void,
 * }} props
 */
export function ShortTermForecastTab({
  result,
  loading,
  error,
  generatedAtMs,
  showContextRibbon,
  onShowContextRibbonChange,
  simContext,
  onGenerate,
}) {
  const [signalsOpen, setSignalsOpen] = useState(false);

  const contextRibbon =
    result && showContextRibbon
      ? buildContextRibbon(simContext, result.horizon168h)
      : result?.contextRibbon ?? null;

  const generatedLabel =
    generatedAtMs != null
      ? new Date(generatedAtMs).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          style={{
            padding: "8px 18px",
            background: loading ? C.border : C.amber,
            border: `1px solid ${C.amber}`,
            borderRadius: 2,
            cursor: loading ? "wait" : "pointer",
            color: loading ? C.dim : "#000",
            fontSize: 11,
            fontFamily: FONT_UI,
            fontWeight: 700,
            letterSpacing: "0.06em",
          }}
        >
          {loading ? "GENERATING…" : "GENERATE FORECAST"}
        </button>
        {generatedLabel && (
          <span style={{ fontSize: 11, color: C.hint, fontFamily: FONT_UI }}>
            Last updated: {generatedLabel}
          </span>
        )}
        <label
          style={{
            fontSize: 11,
            color: C.dim,
            display: "flex",
            alignItems: "center",
            gap: 7,
            cursor: "pointer",
            marginLeft: "auto",
          }}
        >
          <input
            type="checkbox"
            checked={showContextRibbon}
            onChange={(e) => onShowContextRibbonChange(e.target.checked)}
            style={{ accentColor: C.amber }}
          />
          Show long-term context
        </label>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            border: `1px solid ${C.red}`,
            borderRadius: 4,
            color: C.red,
            fontSize: 11,
            fontFamily: FONT_UI,
          }}
        >
          {error}
        </div>
      )}

      {!result && !loading && !error && (
        <div style={{ fontSize: 12, color: C.hint, fontFamily: FONT_UI, lineHeight: 1.6 }}>
          Click Generate to fetch live market signals and produce 24h and 168h price distributions.
          This is an exploratory short-term model — not a trading signal.
        </div>
      )}

      {result && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
            }}
          >
            <KPI label="Spot" value={fmtUSD(result.spotUsd)} />
            <KPI
              label="24h median"
              value={fmtUSD(result.horizon24h.median)}
              sub={`P(up): ${(result.horizon24h.probUp * 100).toFixed(0)}%`}
            />
            <KPI
              label="168h median"
              value={fmtUSD(result.horizon168h.median)}
              sub={`P(up): ${(result.horizon168h.probUp * 100).toFixed(0)}%`}
            />
            <KPI
              label="168h band"
              value={`${fmtUSD(result.horizon168h.p10)} – ${fmtUSD(result.horizon168h.p90)}`}
              sub="10th–90th percentile"
            />
          </div>

          <ForecastDistributionChart
            title="24H FORECAST (T+24h from now) — probability density of BTC/USD"
            horizonPdf={result.horizon24h}
            contextRibbon={contextRibbon}
            showContext={false}
          />
          <ForecastDistributionChart
            title="168H FORECAST (T+168h / 7 days from now) — probability density of BTC/USD"
            horizonPdf={result.horizon168h}
            contextRibbon={contextRibbon}
            showContext={showContextRibbon}
          />

          <div
            style={{
              padding: "14px 16px",
              background: "#0e0e0e",
              borderRadius: 4,
              border: `1px solid ${C.border}`,
            }}
          >
            <div style={{ fontSize: 12, color: C.text, fontFamily: FONT_UI, marginBottom: 10, lineHeight: 1.5 }}>
              {result.narrative.headline}
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: C.dim, fontSize: 11, fontFamily: FONT_UI, lineHeight: 1.65 }}>
              {result.narrative.factors.map((f) => (
                <li key={f.id}>{f.text}</li>
              ))}
            </ul>
            {result.narrative.warnings.length > 0 && (
              <div style={{ marginTop: 10, color: C.amber, fontSize: 11, fontFamily: FONT_UI }}>
                {result.narrative.warnings.map((w) => (
                  <div key={w}>⚠ {w}</div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 10, fontSize: 11, color: C.hint, fontFamily: FONT_UI }}>
              {result.narrative.horizonComparison}
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: C.gray, fontFamily: FONT_UI }}>
              Fed funds: {result.fedPolicy.fundsRateLower}–{result.fedPolicy.fundsRateUpper}% (snapshot{" "}
              {result.fedPolicy.lastUpdated}). {result.narrative.disclaimer}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSignalsOpen((o) => !o)}
            style={{
              alignSelf: "flex-start",
              background: "transparent",
              border: `1px solid ${C.border}`,
              color: C.dim,
              padding: "4px 10px",
              fontSize: 10,
              fontFamily: FONT_UI,
              cursor: "pointer",
              borderRadius: 2,
            }}
          >
            {signalsOpen ? "Hide signals" : "Show signals used"}
          </button>

          {signalsOpen && (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 11,
                fontFamily: FONT_NUM,
                color: C.dim,
              }}
            >
              <tbody>
                {[
                  ["BTC 1d return", `${(result.features.rBtc1d * 100).toFixed(2)}%`],
                  ["BTC 7d return", `${(result.features.rBtc7d * 100).toFixed(2)}%`],
                  ["BTC 30d vol (ann.)", `${(result.features.volBtc30d * 100).toFixed(1)}%`],
                  ["SPY 1d return", `${(result.features.rSpy1d * 100).toFixed(2)}%`],
                  ["SPY 7d return", `${(result.features.rSpy7d * 100).toFixed(2)}%`],
                  ["Fear & Greed", result.features.fearGreed ?? "—"],
                  ["FOMC week", result.features.isFomcWeek ? "yes" : "no"],
                  ["Days to FOMC", result.features.daysToDecision ?? "—"],
                  ["Mixture (168h)", result.horizon168h.mixtureActive ? "active" : "off"],
                  ["Degraded", result.features.degradedFeatures.join(", ") || "none"],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: "4px 8px", borderBottom: `1px solid ${C.border}`, color: C.hint }}>{k}</td>
                    <td style={{ padding: "4px 8px", borderBottom: `1px solid ${C.border}` }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div
            style={{
              marginTop: 4,
              padding: "12px 16px",
              background: "#0e0e0e",
              borderRadius: 4,
              border: `1px solid ${C.border}`,
              fontSize: 11,
              color: C.hint,
              fontFamily: FONT_UI,
              lineHeight: 1.65,
            }}
          >
            <span style={{ color: C.red, fontWeight: 700 }}>SHORT-TERM FORECAST: </span>
            1–7 day distributions are highly uncertain and sensitive to missing data. Fed outlook uses bundled
            policy snapshot, not live FedWatch.{" "}
            <span style={{ color: C.red }}>NOT FINANCIAL ADVICE.</span>
          </div>
        </>
      )}
    </div>
  );
}
