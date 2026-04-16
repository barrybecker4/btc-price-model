import { C, FONT_MONO } from "../theme.js";

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
          fontSize: 9,
          color: C.hint,
          fontFamily: FONT_MONO,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color, fontFamily: FONT_MONO }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: C.dim, fontFamily: FONT_MONO, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
