import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { C, FONT_NUM, FONT_UI } from "../../theme.js";
import { YEAR_START } from "../../sim/constants.js";
import { fmtUSD } from "../../utils/format.js";
import { TIP, XAXIS_PROPS } from "../../charts/rechartsConfig.js";
import { daysSinceGenesis, powerLawBoundsUsd } from "../../utils/powerLaw.js";
import { attachSpyOverlay, scaleSpyOverlayToBtcAtAnchor } from "../../utils/spyProjection.js";
import { HalvingVLines } from "./HalvingVLines.jsx";
import { ShockLine } from "./ShockLine.jsx";

function PriceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const yr = typeof label === "number" ? label.toFixed(1) : String(label);
  const prem = row?.unmetPremiumPct ?? 0;
  const showPrem = prem > 0.005;
  return (
    <div style={TIP.contentStyle}>
      <div style={{ ...TIP.labelStyle, fontFamily: FONT_UI }}>YEAR {yr}</div>
      {payload.map((item) => (
        <div key={String(item.dataKey)} style={{ ...TIP.itemStyle, fontFamily: FONT_NUM, marginTop: 2 }}>
          {item.name}: {fmtUSD(item.value ?? 0)}
        </div>
      ))}
      {showPrem && (
        <div style={{ color: C.hint, fontSize: 10, marginTop: 8, fontFamily: FONT_UI, lineHeight: 1.35 }}>
          Unmet-demand price premium (month): +{prem.toFixed(2)}% (float cap)
        </div>
      )}
    </div>
  );
}

const POWER_LAW_UPPER_STROKE = C.ancient;
const POWER_LAW_LOWER_STROKE = "#14b8a6";
const SERIES_KEYS = ["price", "priceReal", "powerLawUpper", "powerLawLower", "spy", "spyReal"];

/** Recharts log scale requires every plotted value to be strictly positive. */
const MIN_LOG_USD = 1e-9;

function clampRowForLogScale(row) {
  return {
    ...row,
    price: Math.max(MIN_LOG_USD, Number(row.price) || MIN_LOG_USD),
    priceReal: Math.max(MIN_LOG_USD, Number(row.priceReal) || MIN_LOG_USD),
    ...(row.powerLawUpper != null && row.powerLawLower != null
      ? {
          powerLawUpper: Math.max(MIN_LOG_USD, row.powerLawUpper),
          powerLawLower: Math.max(MIN_LOG_USD, row.powerLawLower),
        }
      : {}),
    ...(row.spy != null ? { spy: Math.max(MIN_LOG_USD, Number(row.spy) || MIN_LOG_USD) } : {}),
    ...(row.spyReal != null ? { spyReal: Math.max(MIN_LOG_USD, Number(row.spyReal) || MIN_LOG_USD) } : {}),
  };
}

export function PriceChart({
  data,
  first,
  inflation,
  gdpGrowth,
  logScale,
  yAxisScale = 1,
  halvings,
  supplyShockYear,
  overlayPowerLaw,
  onOverlayPowerLawChange,
  overlaySpy,
  onOverlaySpyChange,
  spyBullishness,
  onSpyBullishnessChange,
  showHistorical,
  onShowHistoricalChange,
  /** When historical series is merged, draw a vertical guide at the sim anchor (today). */
  showProjectionStartLine = false,
  historicalLoading = false,
  historicalError = null,
}) {
  const { chartData, baseAxisMin, baseAxisMax } = useMemo(() => {
    let rows = data;
    if (overlayPowerLaw) {
      rows = data.map((row) => {
        const days = daysSinceGenesis(row.year);
        const { upper, lower } = powerLawBoundsUsd(days);
        return { ...row, powerLawUpper: upper, powerLawLower: lower };
      });
    }
    if (overlaySpy) {
      rows = attachSpyOverlay(rows, {
        yearStart: YEAR_START,
        inflationPct: inflation,
        gdpGrowthPct: gdpGrowth,
        spyBullishness,
      });
      rows = scaleSpyOverlayToBtcAtAnchor(rows, YEAR_START);
    }
    if (logScale) rows = rows.map(clampRowForLogScale);
    const unscaledRows = rows;

    let maxValue = 0;
    for (const row of unscaledRows) {
      for (const key of SERIES_KEYS) {
        const value = Number(row[key]);
        if (Number.isFinite(value) && value > maxValue) maxValue = value;
      }
    }
    const fallbackMax = first?.price > 0 ? first.price : 1;
    const axisMax = Math.max(1, maxValue || fallbackMax);
    const axisMin = logScale
      ? Math.max(MIN_LOG_USD, (unscaledRows[0]?.price > 0 ? unscaledRows[0].price : fallbackMax) * 0.5)
      : 0;

    return { chartData: rows, baseAxisMin: axisMin, baseAxisMax: axisMax };
  }, [data, overlayPowerLaw, overlaySpy, logScale, inflation, gdpGrowth, first, spyBullishness]);

  const safeScale = Math.max(1, Number(yAxisScale) || 1);
  const scaledAxisMax = Math.max(baseAxisMin * (logScale ? 1.05 : 1), baseAxisMax / safeScale);

  const yAxisPrice = {
    scale: logScale ? "log" : "linear",
    domain: [baseAxisMin, scaledAxisMax],
    allowDataOverflow: true,
    tickFormatter: fmtUSD,
    stroke: "#1e1e1e",
    tick: { fontSize: 11, fill: C.dim, fontFamily: FONT_NUM },
    tickLine: false,
    width: 82,
    allowDecimals: false,
  };

  return (
    <>
      <div style={{ fontSize: 11, color: C.hint, marginBottom: 8, letterSpacing: "0.04em", fontFamily: FONT_UI }}>
        BTC PRICE (USD) — Nominal vs Inflation-Adjusted · Halvings &amp; Supply Shock Marked
      </div>
      <ResponsiveContainer width="100%" height={620}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
          <CartesianGrid stroke="#141414" strokeDasharray="3 3" />
          <XAxis {...XAXIS_PROPS} />
          <YAxis yAxisId="p" {...yAxisPrice} />
          <Tooltip content={<PriceTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: FONT_UI, paddingTop: 8 }} />
          <HalvingVLines halvings={halvings} yAxisId="p" />
          <ShockLine supplyShockYear={supplyShockYear} yAxisId="p" />
          {showProjectionStartLine && (
            <ReferenceLine
              x={parseFloat(YEAR_START.toFixed(4))}
              yAxisId="p"
              stroke={C.blue}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              label={{
                value: "Now",
                position: "insideTop",
                // Same vertical nudge as ShockLine — keeps halving labels (insideTopLeft) readable.
                dy: 17,
                // Anchor is on the line; nudge left so the dash does not run through the text.
                dx: -22,
                fill: C.blue,
                fontSize: 10,
                fontFamily: FONT_UI,
              }}
            />
          )}
          <Line
            yAxisId="p"
            type="monotone"
            dataKey="price"
            name="Nominal Price"
            stroke={C.amber}
            dot={false}
            strokeWidth={2.5}
          />
          <Line
            yAxisId="p"
            type="monotone"
            dataKey="priceReal"
            name={`Price in today's dollars (${inflation}% inflation adj.)`}
            stroke="#aa6600"
            dot={false}
            strokeWidth={1.5}
            strokeDasharray="5 3"
          />
          {overlayPowerLaw && (
            <>
              <Line
                yAxisId="p"
                type="monotone"
                dataKey="powerLawUpper"
                name="Power law upper"
                stroke={POWER_LAW_UPPER_STROKE}
                dot={false}
                strokeWidth={1.25}
                strokeDasharray="4 4"
              />
              <Line
                yAxisId="p"
                type="monotone"
                dataKey="powerLawLower"
                name="Power law lower"
                stroke={POWER_LAW_LOWER_STROKE}
                dot={false}
                strokeWidth={1.25}
                strokeDasharray="4 4"
              />
            </>
          )}
          {overlaySpy && (
            <>
              <Line
                yAxisId="p"
                type="monotone"
                dataKey="spy"
                name="SPY"
                stroke={C.blue}
                dot={false}
                strokeWidth={2}
                connectNulls={false}
              />
              <Line
                yAxisId="p"
                type="monotone"
                dataKey="spyReal"
                name="SPY (${inflation}% inflation adj.)"
                stroke={C.ancient}
                dot={false}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                connectNulls={false}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
      <div style={{ marginTop: 10 }}>
        <label
          style={{
            fontSize: 11,
            color: C.dim,
            display: "flex",
            alignItems: "center",
            gap: 7,
            cursor: "pointer",
            fontFamily: FONT_UI,
          }}
        >
          <input
            type="checkbox"
            checked={showHistorical}
            onChange={(e) => onShowHistoricalChange(e.target.checked)}
            style={{ accentColor: C.amber }}
          />
          Show historical data (2011–present)
        </label>
        {historicalLoading && (
          <div style={{ marginTop: 6, fontSize: 10, color: C.hint, fontFamily: FONT_UI }}>Loading historical prices…</div>
        )}
        {historicalError && !historicalLoading && (
          <div style={{ marginTop: 6, fontSize: 10, color: C.red, fontFamily: FONT_UI, maxWidth: 720 }}>
            {historicalError}
            {" — "}
            Uncheck and check again to retry.
          </div>
        )}
      </div>
      <div style={{ marginTop: 10 }}>
        <div
          style={{
            fontSize: 11,
            color: C.dim,
            display: "flex",
            alignItems: "center",
            gap: 7,
            flexWrap: "wrap",
            fontFamily: FONT_UI,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={overlayPowerLaw}
              onChange={(e) => onOverlayPowerLawChange(e.target.checked)}
              style={{ accentColor: C.amber }}
            />
            Overlay{" "}
          </label>
          <a
            href="https://charts.bitbo.io/long-term-power-law/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: C.blue, textDecoration: "underline" }}
          >
            power law model
          </a>
          <span> bounds</span>
        </div>
        {overlayPowerLaw && (
          <div
            style={{
              marginTop: 6,
              maxWidth: 720,
              fontSize: 10,
              lineHeight: 1.4,
              color: C.hint,
              fontFamily: FONT_UI,
            }}
          >
            Santostasi-style power-law corridor (reference only — not produced by this simulation).
          </div>
        )}
      </div>
      <div
        style={{
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "6px 16px",
          fontFamily: FONT_UI,
        }}
      >
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
          <input
            type="checkbox"
            checked={overlaySpy}
            onChange={(e) => onOverlaySpyChange(e.target.checked)}
            style={{ accentColor: C.amber }}
          />
          Overlay SPY (S&P 500)
        </label>
        {overlaySpy && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flex: "1 1 200px",
              maxWidth: 400,
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: 11, color: C.dim, whiteSpace: "nowrap" }}>How Bullish?</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={spyBullishness}
              onChange={(e) => onSpyBullishnessChange(Number(e.target.value))}
              style={{ flex: 1, accentColor: C.amber, cursor: "ew-resize", minWidth: 80 }}
            />
            <span style={{ fontSize: 11, color: C.hint, minWidth: 36, textAlign: "right" }}>
              {spyBullishness.toFixed(2)}
            </span>
          </div>
        )}
      </div>
      {overlaySpy && (
        <div
          style={{
            marginTop: 6,
            maxWidth: 720,
            fontSize: 10,
            lineHeight: 1.4,
            color: C.hint,
            fontFamily: FONT_UI,
          }}
        >
          SPY is scaled to nominal BTC at the &ldquo;Now&rdquo; anchor. Past: historical closes. Future nominal path
          interpolates between bear (&minus;2% vs. base) and bull (+2% vs. base) using the slider; the
          inflation-adjusted SPY line uses the reference return (nominal minus inflation).
        </div>
      )}
      <div
        style={{
          marginTop: 10,
          maxWidth: 720,
          fontSize: 11,
          lineHeight: 1.45,
          color: C.hint,
          fontFamily: FONT_UI,
        }}
      >
        <span style={{ color: C.red, fontWeight: 600 }}>Supply Shock</span>
        {" — "}
        The red dashed vertical line is drawn the first time modeled{" "}
        <strong style={{ color: C.text }}>liquid</strong> BTC (coins still treated as available to the
        market after treasuries, ETFs, and lost supply) drops{" "}
        <strong style={{ color: C.text }}>below 30%</strong> of where it started. It is a stylized
        &ldquo;free-float mostly gone&rdquo; moment, not a price crash marker. Placement depends on all
        demand flows and price (including the mining cost floor, which changes how many BTC each dollar
        of buying removes from that pool).
      </div>
    </>
  );
}
