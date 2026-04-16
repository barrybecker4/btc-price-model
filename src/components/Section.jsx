import { useState } from "react";
import { C, FONT_UI } from "../theme.js";

export function Section({ title, children, open: def = true }) {
  const [open, setOpen] = useState(def);
  return (
    <div style={{ marginBottom: 5 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "7px 9px",
          background: open ? "#1a1a1a" : "#141414",
          border: `1px solid ${open ? C.amberDim : C.border}`,
          borderRadius: 3,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: C.amber,
          fontFamily: FONT_UI,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {title}
        <span style={{ color: C.dim, fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "10px 6px 4px 8px", borderLeft: "1px solid #1c1c1c", marginLeft: 2 }}>
          {children}
        </div>
      )}
    </div>
  );
}
