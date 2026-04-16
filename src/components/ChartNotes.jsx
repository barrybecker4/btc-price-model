import { C, FONT_MONO } from "../theme.js";

export function ChartNotes() {
  return (
    <div
      style={{
        marginTop: 16,
        padding: "11px 15px",
        background: "#0e0e0e",
        borderRadius: 4,
        border: `1px solid ${C.border}`,
        fontSize: 9,
        color: C.hint,
        fontFamily: FONT_MONO,
        lineHeight: 2,
      }}
    >
      <span style={{ color: "#777", fontWeight: 700 }}>PRICE MECHANISM: </span>
      Monthly Δprice = (net demand ÷ liquid BTC) × elasticity. Elasticity amplifies as liquid supply shrinks — a thin order book means
      each BTC of net demand moves price farther. GDP growth is applied as an extra monthly multiplier on all USD-denominated flows,
      representing money-supply expansion.
      <span style={{ color: "#555" }}>
        {" "}
        MSTR&apos;s BTC/day falls as price rises (USD fixed; BTC purchased = USD ÷ price) — the natural brake on accumulation rate.{" "}
      </span>
      <span style={{ color: "#664444" }}>NOT FINANCIAL ADVICE.</span>
    </div>
  );
}
