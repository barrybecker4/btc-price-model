import { ReferenceLine } from "recharts";
import { C, FONT_UI } from "../../theme.js";

/** Vertical guides for modeled ETF stress redemption events. */
export function EtfStressLines({ years, yAxisId }) {
  if (!years?.length) return null;
  return years.map((year, index) => (
    <ReferenceLine
      key={`${year}-${index}`}
      x={parseFloat(year.toFixed(3))}
      {...(yAxisId != null ? { yAxisId } : {})}
      stroke={C.blue}
      strokeWidth={1.25}
      strokeDasharray="2 5"
      label={{
        value: "ETF Stress",
        position: index % 2 === 0 ? "insideTopRight" : "insideTopLeft",
        dy: 34,
        fill: C.blue,
        fontSize: 10,
        fontFamily: FONT_UI,
        fontWeight: 600,
      }}
    />
  ));
}
