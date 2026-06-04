import { DEFAULTS, REFERENCE_MINING_BTC_PER_DAY } from "../../sim/config/constants.js";
import { C, FONT_NUM, FONT_UI } from "../../theme.js";
import { safeDivide } from "../../utils/format.js";

export function SidebarStatsAndReset({ strcInitialDayBtc, effectiveSupply, setP }) {
  return (
    <>
      <div
        style={{
          marginTop: 10,
          padding: "10px 11px",
          background: "#0d0d0d",
          border: `1px solid ${C.border}`,
          borderRadius: 3,
          fontFamily: FONT_UI,
        }}
      >
        {[
          ["Initial MSTR BTC/day", strcInitialDayBtc.toLocaleString(), C.text],
          ["vs mining output", `${REFERENCE_MINING_BTC_PER_DAY} BTC/day`, C.green],
          ["Demand ratio", `${safeDivide(strcInitialDayBtc, REFERENCE_MINING_BTC_PER_DAY, 0).toFixed(1)}×`, C.red],
          ["Effective supply", `${(effectiveSupply / 1e6).toFixed(2)}M BTC`, C.text],
        ].map(([lbl, val, col]) => (
          <div key={lbl} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, lineHeight: 2.05 }}>
            <span style={{ color: C.hint }}>{lbl}:</span>
            <span
              style={{
                color: col,
                fontWeight: col !== C.text ? 700 : 400,
                fontFamily: FONT_NUM,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {val}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setP(DEFAULTS)}
        style={{
          width: "100%",
          marginTop: 10,
          padding: "7px 0",
          background: "transparent",
          border: `1px solid ${C.border}`,
          borderRadius: 3,
          color: C.dim,
          cursor: "pointer",
          fontSize: 10,
          fontFamily: FONT_UI,
          letterSpacing: "0.08em",
        }}
      >
        ↺ RESET TO DEFAULTS
      </button>
    </>
  );
}
