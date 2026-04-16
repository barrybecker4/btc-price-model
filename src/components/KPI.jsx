import { C, FONT_NUM, FONT_UI } from "../theme.js";

export function KPI({ label, value, sub, warn, highlight }) {
  const color = warn ? C.red : highlight ? C.amber : C.text;
  return (
    <div
      style={{
        flex: "1 1 120px",
        background: "#0f0f0f",
        border: `1px solid ${warn ? "#441111" : highlight ? "#3a2800" : C.border}`,
        borderRadius: 4,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: C.hint,
          fontFamily: FONT_UI,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: 5,
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
      {sub && (
        <div style={{ fontSize: 11, color: C.dim, fontFamily: FONT_UI, marginTop: 4, lineHeight: 1.35 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
