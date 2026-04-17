import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { C, FONT_NUM, FONT_UI } from "../../theme.js";
import { TIP, XAXIS_PROPS } from "../../charts/rechartsConfig.js";
import { ShockLine } from "./ShockLine.jsx";

export function SupplyChart({ data, supplyShockYear }) {
  return (
    <>
      <div style={{ fontSize: 11, color: C.hint, marginBottom: 8, letterSpacing: "0.04em", fontFamily: FONT_UI }}>
        BTC SUPPLY BREAKDOWN (MILLIONS) — Treasuries, ETFs &amp; LTH vs tradeable liquid
      </div>
      <ResponsiveContainer width="100%" height={310}>
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
          <CartesianGrid stroke="#141414" strokeDasharray="3 3" />
          <XAxis {...XAXIS_PROPS} />
          <YAxis
            stroke="#1e1e1e"
            tick={{ fontSize: 11, fill: C.dim, fontFamily: FONT_NUM }}
            tickLine={false}
            tickFormatter={(v) => `${v.toFixed(1)}M`}
            width={60}
          />
          <Tooltip
            {...TIP}
            formatter={(v, n) => [`${parseFloat(v).toFixed(3)}M BTC`, n]}
            labelFormatter={(v) => `YEAR ${parseFloat(v).toFixed(1)}`}
          />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: FONT_UI, paddingTop: 8 }} />
          <Area type="monotone" dataKey="lostM" name="Lost Forever" stackId="1" fill={C.lost} stroke={C.lost} fillOpacity={1} />
          <Area
            type="monotone"
            dataKey="treasuryM"
            name="Corp. Treasury (HODL)"
            stackId="1"
            fill={C.treasury}
            stroke={C.treasury}
            fillOpacity={0.8}
          />
          <Area type="monotone" dataKey="etfM" name="ETF Holdings" stackId="1" fill={C.etf} stroke={C.etf} fillOpacity={0.8} />
          <Area
            type="monotone"
            dataKey="lthYoungM"
            name="LTH 155d+ (excl. Ancient)"
            stackId="1"
            fill={C.lth}
            stroke={C.lth}
            fillOpacity={0.85}
          />
          <Area
            type="monotone"
            dataKey="ancientM"
            name="Ancient 7y+ (excl. Lost)"
            stackId="1"
            fill={C.ancient}
            stroke={C.ancient}
            fillOpacity={0.85}
          />
          <Area
            type="monotone"
            dataKey="liquidM"
            name="Liquid (tradeable float)"
            stackId="1"
            fill={C.liquid}
            stroke={C.liquid}
            fillOpacity={0.7}
          />
          <ShockLine supplyShockYear={supplyShockYear} />
        </AreaChart>
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
        <strong style={{ color: C.text }}>Ancient</strong> here is 7y+ among coins <strong>not</strong> counted as Lost — headline on-chain &ldquo;ancient&rdquo; often includes unmoved Satoshi coins; if Satoshi is in{' '}
        <strong style={{ color: C.text }}>Already-Lost</strong>, those BTC appear under Lost Forever, not Ancient. Model Ancient % can run below glassnode-style headlines when Satoshi is modeled as Lost.
      </div>
    </>
  );
}
