import { ReferenceLine } from "recharts";
import { C, FONT_UI } from "../../theme.js";
import { ChartAnnotationLabel } from "./ChartAnnotationLabel.jsx";

const ETF_STRESS_TOOLTIP =
  "ETF investors collectively redeem shares during a risk-off period, forcing ETF issuers or market makers to release/sell some BTC instead of absorbing BTC.";

/** Vertical guides for modeled ETF stress redemption events. */
export function EtfStressLines({ years, yAxisId }) {
  if (!years?.length) return null;
  return years.map((year, index) => (
    <ReferenceLine
      key={`${year}-${index}`}
      x={parseFloat(year.toFixed(3))}
      {...(yAxisId != null ? { yAxisId } : {})}
      stroke={C.red}
      strokeWidth={1.25}
      strokeDasharray="2 5"
      label={{
        position: index % 2 === 0 ? "insideTopRight" : "insideTopLeft",
        dy: 34,
        content: (props) => (
          <ChartAnnotationLabel
            {...props}
            text="ETF Stress"
            tooltip={ETF_STRESS_TOOLTIP}
            fill={C.red}
            fontSize={10}
            fontFamily={FONT_UI}
            fontWeight={600}
          />
        ),
      }}
    />
  ));
}
