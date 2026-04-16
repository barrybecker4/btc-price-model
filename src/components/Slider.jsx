import { C, FONT_MONO } from "../theme.js";

export function Slider({ label, hint, value, min, max, step, onChange, fmt }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ fontSize: 11, color: C.label, fontFamily: FONT_MONO }}>{label}</span>
        <span style={{ fontSize: 12, color: C.amber, fontFamily: FONT_MONO, fontWeight: 700 }}>
          {fmt ? fmt(value) : value}
        </span>
      </div>
      {hint && (
        <div style={{ fontSize: 9, color: C.hint, marginBottom: 4, fontFamily: FONT_MONO, lineHeight: 1.55 }}>
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
