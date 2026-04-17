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
import { fmtUSD } from "../../utils/format.js";
import { TIP, XAXIS_PROPS } from "../../charts/rechartsConfig.js";

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

function HalvingLines({ halvings, yAxisId }) {
  return halvings.map((y) => (
    <ReferenceLine
      key={y}
      x={y}
      yAxisId={yAxisId}
      stroke="#222"
      strokeWidth={1.5}
      strokeDasharray="4 4"
      label={{ value: `⛏ ${y}`, position: "insideTopLeft", fill: "#9a9a9a", fontSize: 10, fontFamily: FONT_UI }}
    />
  ));
}

function ShockLine({ supplyShockYear, yAxisId }) {
  if (!supplyShockYear) return null;
  return (
    <ReferenceLine
      x={parseFloat(supplyShockYear.toFixed(1))}
      yAxisId={yAxisId}
      stroke={C.red}
      strokeWidth={1.5}
      strokeDasharray="6 3"
      label={{
        value: "Supply Shock",
        position: "insideTopRight",
        fill: C.red,
        fontSize: 10,
        fontFamily: FONT_UI,
        fontWeight: 600,
      }}
    />
  );
}

export function PriceChart({ data, first, inflation, logScale, halvings, supplyShockYear }) {
  const yAxisPrice = {
    scale: logScale ? "log" : "linear",
    domain: logScale ? [first.price * 0.5, "auto"] : [0, "auto"],
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
      <ResponsiveContainer width="100%" height={310}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
          <CartesianGrid stroke="#141414" strokeDasharray="3 3" />
          <XAxis {...XAXIS_PROPS} />
          <YAxis yAxisId="p" {...yAxisPrice} />
          <Tooltip content={<PriceTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: FONT_UI, paddingTop: 8 }} />
          <HalvingLines halvings={halvings} yAxisId="p" />
          <ShockLine supplyShockYear={supplyShockYear} yAxisId="p" />
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
            name={`Real Price (${inflation}% adj.)`}
            stroke="#aa6600"
            dot={false}
            strokeWidth={1.5}
            strokeDasharray="5 3"
          />
        </LineChart>
      </ResponsiveContainer>
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
