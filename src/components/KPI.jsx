import { useState } from "react";
import { C, FONT_NUM, FONT_UI } from "../theme.js";

export function KPI({ label, value, sub, tooltip, warn, highlight }) {
  const [open, setOpen] = useState(false);
  const hasTip = Boolean(sub || tooltip);
  const color = warn ? C.red : highlight ? C.amber : C.text;

  return (
    <div
      tabIndex={hasTip ? 0 : undefined}
      onMouseEnter={() => hasTip && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => hasTip && setOpen(true)}
      onBlur={() => setOpen(false)}
      style={{
        flex: "1 1 120px",
        background: "#0f0f0f",
        border: `1px solid ${warn ? "#441111" : highlight ? "#3a2800" : C.border}`,
        borderRadius: 4,
        padding: "8px 12px",
        position: "relative",
        zIndex: open ? 40 : undefined,
        cursor: hasTip ? "help" : undefined,
        outline: "none",
        boxShadow: open && hasTip ? `0 0 0 1px ${C.amberDim}` : undefined,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: C.hint,
          fontFamily: FONT_UI,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: 4,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color,
          fontFamily: FONT_NUM,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {open && hasTip && (
        <>
          {/* Keeps hover alive between the card and the tooltip (no pointer dead zone). */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "100%",
              height: 8,
              zIndex: 49,
            }}
          />
          <div
            role="tooltip"
            style={{
              position: "absolute",
              left: 0,
              top: "100%",
              marginTop: 8,
              minWidth: 200,
              maxWidth: 320,
              padding: "10px 12px",
              fontSize: 11,
              lineHeight: 1.45,
              color: C.dim,
              fontFamily: FONT_UI,
              background: "#1a1a1a",
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
              zIndex: 50,
            }}
          >
            {sub && <div>{sub}</div>}
            {tooltip && (
              <div style={{ marginTop: sub ? 8 : 0, color: C.hint, fontSize: 11, lineHeight: 1.45 }}>{tooltip}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
