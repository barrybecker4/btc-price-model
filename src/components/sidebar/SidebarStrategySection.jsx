import { nominalGdpGrowthPct } from "../../sim/macro/nominalGdp.js";
import { Section } from "../Section.jsx";
import { Slider } from "../Slider.jsx";

export function SidebarStrategySection({ p, set }) {
  const nominalGdp = nominalGdpGrowthPct(p.realGdpGrowth, p.inflation);
  return (
    <Section title="🏦 Strategy / MSTR">
      <Slider
        label="Initial BTC Holdings"
        value={p.strcInitialBtc}
        min={800000}
        max={1500000}
        step={10000}
        onChange={set("strcInitialBtc")}
        fmt={(v) => `${(v / 1000).toFixed(0)}K BTC`}
      />
      <Slider
        label="Initial Annual USD Purchase Rate"
        hint="Strategy's BTC acquisition spend at t=0 (annualized). This is the starting rate — grows each year at the rate below."
        hintDetail="Converted to BTC/month against the starting price; subject to float cap when that mode is on."
        value={p.strcInitialUsdB}
        min={20}
        max={50}
        step={1}
        onChange={set("strcInitialUsdB")}
        fmt={(v) => `$${v}B/yr`}
      />
      <Slider
        label="Annual Capital Raise Growth"
        hint={`Rate at which Strategy grows its USD capital raises annually. Logistic taper (below) converges this toward nominal GDP (${nominalGdp.toFixed(1)}%/yr = real + inflation). Strategy has historically grown well above inflation via convertible notes and ATM offerings.`}
        value={p.strcGrowthRate}
        min={5}
        max={50}
        step={1}
        onChange={set("strcGrowthRate")}
        fmt={(v) => `${v}%/yr`}
      />
      <Slider
        label="MSTR growth taper horizon"
        hint="Years over which capital-raise growth logistically tapers to nominal GDP (real + inflation, macro block). Shorter = faster convergence to GDP pace."
        value={p.strcGrowthTaperYears}
        min={5}
        max={70}
        step={1}
        onChange={set("strcGrowthTaperYears")}
        fmt={(v) => `${v} yrs`}
      />
    </Section>
  );
}
