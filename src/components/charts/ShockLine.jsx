import { ReferenceLine } from "recharts";
import { C, FONT_UI } from "../../theme.js";
import { ChartAnnotationLabel } from "./ChartAnnotationLabel.jsx";

const SUPPLY_SHOCK_TOOLTIP =
  'The first time modeled liquid BTC (coins still treated as available to the market after treasuries, ETFs, and lost supply) drops below 30% of where it started. It is a stylized "free-float mostly gone" moment, not a price crash marker. Placement depends on all demand flows and price (including the mining cost floor, which changes how many BTC each dollar of buying removes from that pool).';

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
        position: "insideTopRight",
        // Vertical-only nudge: `offset` shifts both x and y for insideTopRight; `dy` does not move the anchor x.
        dy: 17,
        content: (props) => (
          <ChartAnnotationLabel
            {...props}
            text="Supply Shock"
            tooltip={SUPPLY_SHOCK_TOOLTIP}
            fill={C.red}
            fontSize={10}
            fontFamily={FONT_UI}
            fontWeight={600}
          />
        ),
      }}
    />
  );
}
