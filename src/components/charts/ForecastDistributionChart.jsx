import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { C, FONT_NUM, FONT_UI } from "../../theme.js";
import { TIP } from "../../charts/rechartsConfig.js";
import { fmtUSD } from "../../utils/format.js";
import { ChartFrame } from "./ChartFrame.jsx";

/**
 * @param {{ active?: boolean, payload?: { payload?: { price: number, density: number } }[], label?: number }} props
 */
function ForecastPdfTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div style={TIP.contentStyle}>
      <div style={{ ...TIP.labelStyle, fontFamily: FONT_UI }}>
        {fmtUSD(row.price)}
      </div>
      <div style={{ ...TIP.itemStyle, fontFamily: FONT_NUM, marginTop: 2 }}>
        Density: {row.density.toExponential(3)}
      </div>
    </div>
  );
}

/**
 * @param {{
 *   title: string,
 *   horizonPdf: import("../../forecast/forecastTypes.js").HorizonPdf,
 *   contextRibbon?: import("../../forecast/forecastTypes.js").ContextRibbonPoint | null,
 *   showContext?: boolean,
 * }} props
 */
export function ForecastDistributionChart({ title, horizonPdf, contextRibbon, showContext }) {
  const chartData = horizonPdf.pdf.map((p) => ({
    price: p.price,
    density: p.density,
  }));

  const refLines = [];
  refLines.push({ x: horizonPdf.spotUsd, stroke: C.amber, label: "Spot" });
  refLines.push({ x: horizonPdf.median, stroke: C.green, label: "Median" });
  if (showContext && contextRibbon) {
    refLines.push({ x: contextRibbon.simPrice7d, stroke: C.blue, label: "Sim 7d" });
    refLines.push({ x: contextRibbon.powerLawTrend, stroke: C.gray, label: "Power law" });
  }

  return (
    <ChartFrame height={280} title={title}>
      <AreaChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid stroke="#141414" strokeDasharray="3 3" />
        <XAxis
          dataKey="price"
          type="number"
          domain={["dataMin", "dataMax"]}
          stroke="#1e1e1e"
          tick={{ fontSize: 10, fill: C.dim, fontFamily: FONT_NUM }}
          tickLine={false}
          tickFormatter={(v) => fmtUSD(v)}
        />
        <YAxis
          stroke="#1e1e1e"
          tick={{ fontSize: 10, fill: C.dim, fontFamily: FONT_NUM }}
          tickLine={false}
          width={48}
          tickFormatter={(v) => v.toExponential(1)}
        />
        <Tooltip content={ForecastPdfTooltip} />
        <Area
          type="monotone"
          dataKey="density"
          stroke={C.amber}
          fill={C.amberDim}
          fillOpacity={0.35}
          strokeWidth={1.5}
          isAnimationActive={false}
        />
        {refLines.map((line) => (
          <ReferenceLine
            key={line.label}
            x={line.x}
            stroke={line.stroke}
            strokeDasharray="4 4"
            label={{
              value: line.label,
              position: "insideTopRight",
              fill: line.stroke,
              fontSize: 10,
              fontFamily: FONT_UI,
            }}
          />
        ))}
      </AreaChart>
    </ChartFrame>
  );
}
