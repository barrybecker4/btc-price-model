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

export function FlowChart({ data, halvings }) {
  return (
    <>
      <div style={{ fontSize: 11, color: C.hint, marginBottom: 8, letterSpacing: "0.04em", fontFamily: FONT_UI }}>
        DAILY FLOW (BTC/DAY) — MSTR buys fewer BTC as price rises. Halvings cut mining supply.
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
          <Tooltip
            {...TIP}
            formatter={(v, n) => [`${Math.round(v).toLocaleString()} BTC/day`, n]}
            labelFormatter={(v) => `YEAR ${parseFloat(v).toFixed(1)}`}
          />
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
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
