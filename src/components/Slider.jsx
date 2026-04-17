import { C, FONT_NUM, FONT_UI } from "../theme.js";
import { ParamHintHotspot } from "./ParamHintHotspot.jsx";

export function Slider({ label, hint, hintDetail, value, min, max, step, onChange, fmt, disabled = false }) {
  const hasHint = Boolean(hint || hintDetail);
  const rowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
    opacity: disabled ? 0.45 : 1,
    ...(hasHint && !disabled ? { cursor: "help", borderRadius: 2 } : {}),
  };

  const rowContent = (
    <>
      <span style={{ fontSize: 13, color: C.label, fontFamily: FONT_UI, fontWeight: 500, minWidth: 0 }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          color: disabled ? C.dim : C.amber,
          fontFamily: FONT_NUM,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}
      >
        {fmt ? fmt(value) : value}
      </span>
    </>
  );

  return (
    <div style={{ marginBottom: 14 }}>
      {hasHint ? (
        <ParamHintHotspot
          hint={hint}
          hintDetail={hintDetail}
          ariaLabel={`More about ${label}`}
          style={rowStyle}
          focusable={!disabled}
        >
          {rowContent}
        </ParamHintHotspot>
      ) : (
        <div style={rowStyle}>{rowContent}</div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-disabled={disabled}
        style={{
          width: "100%",
          accentColor: C.amber,
          cursor: disabled ? "not-allowed" : "pointer",
          height: 3,
          opacity: disabled ? 0.55 : 1,
        }}
      />
    </div>
  );
}
