import { C, FONT_MONO } from "../theme.js";

export const TIP = {
  contentStyle: {
    background: "#161616",
    border: "1px solid #2a2a2a",
    fontSize: 11,
    fontFamily: FONT_MONO,
    padding: "8px 12px",
  },
  labelStyle: { color: C.amber, marginBottom: 4 },
  itemStyle: { color: C.text },
};

export const XAXIS_PROPS = {
  dataKey: "year",
  type: "number",
  scale: "linear",
  domain: ["dataMin", "dataMax"],
  tickFormatter: (v) => Math.floor(v),
  stroke: "#1e1e1e",
  tick: { fontSize: 10, fill: C.dim, fontFamily: FONT_MONO },
  tickLine: false,
};
