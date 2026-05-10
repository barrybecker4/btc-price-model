import { C, FONT_HEAD, FONT_UI } from "../../theme.js";

export function SidebarHeader() {
  return (
    <div
      style={{
        textAlign: "center",
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ fontSize: 19, fontWeight: 700, color: C.amber, fontFamily: FONT_HEAD }}>₿ Supply Shock Model</div>
      <div style={{ fontSize: 10, color: C.hint, marginTop: 4, letterSpacing: "0.1em", fontFamily: FONT_UI }}>
        ADJUST PARAMETERS BELOW
      </div>
    </div>
  );
}
