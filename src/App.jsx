import { useMemo, useState } from "react";
import { ChartNotes } from "./components/ChartNotes.jsx";
import { FlowChart } from "./components/charts/FlowChart.jsx";
import { PriceChart } from "./components/charts/PriceChart.jsx";
import { SupplyChart } from "./components/charts/SupplyChart.jsx";
import { KpiBar } from "./components/KpiBar.jsx";
import { ParameterSidebar } from "./components/ParameterSidebar.jsx";
import { DEFAULTS, YEAR_START } from "./sim/constants.js";
import { runSim } from "./sim/runSim.js";
import { C, FONT_MONO } from "./theme.js";

export default function App() {
  const [p, setP] = useState(DEFAULTS);
  const [tab, setTab] = useState("price");
  const [logScale, setLog] = useState(true);

  const { data, supplyShockYear } = useMemo(() => runSim(p), [p]);
  const cd = useMemo(() => data.filter((_, i) => i % 3 === 0), [data]);
  const first = data[0];
  const last = data[data.length - 1];
  const mult = last.price / first.price;

  const halvings = [2028, 2032, 2036, 2040].filter((y) => y > YEAR_START && y <= YEAR_START + p.simYears);

  const tabBtn = (key, lbl) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      style={{
        padding: "5px 14px",
        background: tab === key ? C.amber : "transparent",
        border: `1px solid ${tab === key ? C.amber : C.border}`,
        borderRadius: 2,
        cursor: "pointer",
        color: tab === key ? "#000" : C.dim,
        fontSize: 10,
        fontFamily: FONT_MONO,
        fontWeight: tab === key ? 700 : 400,
        letterSpacing: "0.06em",
      }}
    >
      {lbl}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: FONT_MONO,
        overflow: "hidden",
      }}
    >
      <ParameterSidebar p={p} setP={setP} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <KpiBar p={p} last={last} supplyShockYear={supplyShockYear} mult={mult} />

        <div style={{ flex: 1, padding: "14px 20px", overflow: "auto" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, alignItems: "center" }}>
            {tabBtn("price", "PRICE CHART")}
            {tabBtn("supply", "SUPPLY BREAKDOWN")}
            {tabBtn("flow", "DAILY FLOW")}
            {tab === "price" && (
              <label
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  color: C.dim,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  cursor: "pointer",
                }}
              >
                <input type="checkbox" checked={logScale} onChange={(e) => setLog(e.target.checked)} style={{ accentColor: C.amber }} />
                LOG SCALE
              </label>
            )}
          </div>

          {tab === "price" && (
            <PriceChart
              data={cd}
              first={first}
              inflation={p.inflation}
              logScale={logScale}
              halvings={halvings}
              supplyShockYear={supplyShockYear}
            />
          )}
          {tab === "supply" && <SupplyChart data={cd} />}
          {tab === "flow" && <FlowChart data={cd} halvings={halvings} />}

          <ChartNotes />
        </div>
      </div>
    </div>
  );
}
