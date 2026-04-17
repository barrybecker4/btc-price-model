import { ReferenceLine } from "recharts";
import { C, FONT_UI } from "../../theme.js";

/** Vertical line when modeled liquid supply first drops below the shock threshold. */
export function ShockLine({ supplyShockYear, yAxisId }) {
  if (!supplyShockYear) return null;
  return (
    <ReferenceLine
      x={parseFloat(supplyShockYear.toFixed(1))}
      {...(yAxisId != null ? { yAxisId } : {})}
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
