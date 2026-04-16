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
import { C, FONT_MONO } from "../../theme.js";
import { fmtUSD } from "../../utils/format.js";
import { TIP, XAXIS_PROPS } from "../../charts/rechartsConfig.js";

function HalvingLines({ halvings, yAxisId }) {
  return halvings.map((y) => (
    <ReferenceLine
      key={y}
      x={y}
      yAxisId={yAxisId}
      stroke="#222"
      strokeWidth={1.5}
      strokeDasharray="4 4"
      label={{ value: `⛏ ${y}`, position: "insideTopLeft", fill: "#333", fontSize: 8, fontFamily: FONT_MONO }}
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
      label={{ value: "⚠ SHOCK", position: "insideTopRight", fill: C.red, fontSize: 9, fontFamily: FONT_MONO }}
    />
  );
}

export function PriceChart({ data, first, inflation, logScale, halvings, supplyShockYear }) {
  const yAxisPrice = {
    scale: logScale ? "log" : "linear",
    domain: logScale ? [first.price * 0.5, "auto"] : [0, "auto"],
    tickFormatter: fmtUSD,
    stroke: "#1e1e1e",
    tick: { fontSize: 10, fill: C.dim, fontFamily: FONT_MONO },
    tickLine: false,
    width: 82,
    allowDecimals: false,
  };

  return (
    <>
      <div style={{ fontSize: 9, color: C.hint, marginBottom: 8, letterSpacing: "0.06em" }}>
        BTC PRICE (USD) — Nominal vs Inflation-Adjusted · Halvings &amp; Supply Shock Marked
      </div>
      <ResponsiveContainer width="100%" height={310}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
          <CartesianGrid stroke="#141414" strokeDasharray="3 3" />
          <XAxis {...XAXIS_PROPS} />
          <YAxis yAxisId="p" {...yAxisPrice} />
          <Tooltip {...TIP} formatter={(v, n) => [fmtUSD(v), n]} labelFormatter={(v) => `YEAR ${parseFloat(v).toFixed(1)}`} />
          <Legend wrapperStyle={{ fontSize: 10, fontFamily: FONT_MONO, paddingTop: 8 }} />
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
    </>
  );
}
