import { C, FONT_NUM, FONT_UI } from "../theme.js";

export function Slider({ label, hint, value, min, max, step, onChange, fmt }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ fontSize: 13, color: C.label, fontFamily: FONT_UI, fontWeight: 500 }}>{label}</span>
        <span
          style={{
            fontSize: 13,
            color: C.amber,
            fontFamily: FONT_NUM,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmt ? fmt(value) : value}
        </span>
      </div>
      {hint && (
        <div
          style={{
            fontSize: 11,
            color: C.hint,
            marginBottom: 6,
            fontFamily: FONT_UI,
            lineHeight: 1.55,
          }}
        >
          {hint}
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: C.amber, cursor: "pointer", height: 3 }}
      />
    </div>
  );
}
