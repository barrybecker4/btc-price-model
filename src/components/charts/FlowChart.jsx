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
import { TIP, XAXIS_PROPS } from "../../charts/rechartsConfig.js";
import { ShockLine } from "./ShockLine.jsx";

function FlowTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const yr = typeof label === "number" ? label.toFixed(1) : String(label);
  const showRation = row && (row.unmetBuyBtcM ?? 0) > 0.5;
  return (
    <div style={TIP.contentStyle}>
      <div style={{ ...TIP.labelStyle, fontFamily: FONT_UI }}>YEAR {yr}</div>
      {payload.map((item) => (
        <div key={String(item.dataKey)} style={{ ...TIP.itemStyle, fontFamily: FONT_NUM, marginTop: 2 }}>
          {item.name}: {Math.round(item.value ?? 0).toLocaleString()} BTC/day
        </div>
      ))}
      {showRation && (
        <div style={{ color: C.hint, fontSize: 10, marginTop: 8, fontFamily: FONT_UI, lineHeight: 1.35 }}>
          Unmet hoarding demand: {Math.round(row.unmetBuyBtcM).toLocaleString()} BTC/mo ({row.buyRationPct?.toFixed(1)}% of desired not executed)
        </div>
      )}
    </div>
  );
}

export function FlowChart({ data, halvings, supplyShockYear }) {
  return (
    <>
      <div style={{ fontSize: 11, color: C.hint, marginBottom: 8, letterSpacing: "0.04em", fontFamily: FONT_UI }}>
        DAILY FLOW (BTC/DAY) — Totals are executed demand (capped by liquid float when enabled). MSTR buys fewer BTC as price rises. Halvings cut mining supply.
      </div>
      <ResponsiveContainer width="100%" height={310}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
          <CartesianGrid stroke="#141414" strokeDasharray="3 3" />
          <XAxis {...XAXIS_PROPS} />
          <YAxis
            stroke="#1e1e1e"
            tick={{ fontSize: 11, fill: C.dim, fontFamily: FONT_NUM }}
            tickLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v)}
            width={55}
          />
          <Tooltip content={<FlowTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: FONT_UI, paddingTop: 8 }} />
          {halvings.map((y) => (
            <ReferenceLine
              key={y}
              x={y}
              stroke="#222"
              strokeDasharray="4 4"
              label={{ value: "⛏", position: "insideTopLeft", fill: "#303030", fontSize: 10 }}
            />
          ))}
          <Line type="monotone" dataKey="totalBuyDay" name="Total Daily Buying" stroke={C.green} dot={false} strokeWidth={2.5} />
          <Line type="monotone" dataKey="totalSellDay" name="Total Daily Selling" stroke={C.red} dot={false} strokeWidth={2} />
          <Line
            type="monotone"
            dataKey="dailyMining"
            name="Daily Mining Output"
            stroke={C.gray}
            dot={false}
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
          <Line
            type="monotone"
            dataKey="strcDayBtc"
            name="MSTR Daily Purchases (BTC)"
            stroke={C.amber}
            dot={false}
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
          <Line
            type="monotone"
            dataKey="etfDayBtc"
            name="ETF Daily Absorption (BTC)"
            stroke={C.blue}
            dot={false}
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
          <ShockLine supplyShockYear={supplyShockYear} />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
