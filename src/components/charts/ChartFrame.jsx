import { C, FONT_UI } from "../../theme.js";
import { ResponsiveContainer } from "recharts";

/**
 * Shared title + fixed-height chart shell used by price / supply / flow charts.
 * @param {{ title: React.ReactNode, height: number, children: React.ReactNode }} props
 */
export function ChartFrame({ title, height, children }) {
  return (
    <>
      <div style={{ fontSize: 11, color: C.hint, marginBottom: 8, letterSpacing: "0.04em", fontFamily: FONT_UI }}>
        {title}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </>
  );
}
