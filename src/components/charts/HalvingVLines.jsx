import { ReferenceLine } from "recharts";
import { FONT_UI } from "../../theme.js";

/** Gray vertical guides for Bitcoin halving epochs (matches chart annotation style). */
const HALVING_STROKE = "#555555";

function halvingLabel(y) {
  const rounded = Math.round(y);
  return Math.abs(y - rounded) < 0.02 ? `⛏ ${rounded}` : `⛏ ${y.toFixed(1)}`;
}

export function HalvingVLines({ halvings, yAxisId }) {
  if (!halvings?.length) return null;
  return halvings.map((y) => (
    <ReferenceLine
      key={y}
      x={y}
      {...(yAxisId != null ? { yAxisId } : {})}
      stroke={HALVING_STROKE}
      strokeWidth={1}
      label={{
        value: halvingLabel(y),
        position: "insideTopLeft",
        fill: HALVING_STROKE,
        fontSize: 10,
        fontFamily: FONT_UI,
      }}
    />
  ));
}
