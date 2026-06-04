import { Section } from "../Section.jsx";
import { Slider } from "../Slider.jsx";

export function SidebarOtherTreasuriesSection({ p, set }) {
  return (
    <Section title="🏢 Other Treasuries" defaultOpen={false}>
      <Slider
        label="Other Corp. Initial Holdings"
        value={p.otherInitialBtc}
        min={360000}
        max={400000}
        step={1000}
        onChange={set("otherInitialBtc")}
        fmt={(v) => `${(v / 1000).toFixed(0)}K BTC`}
      />
      <Slider
        label="Other Corp. Annual USD"
        hint="MARA, Riot, Metaplanet, Semler Scientific, etc."
        value={p.otherTreasuryUsdB}
        min={0}
        max={150}
        step={2}
        onChange={set("otherTreasuryUsdB")}
        fmt={(v) => `$${v}B/yr`}
      />
      <Slider
        label="Other Corp. Growth"
        hint="Catching up as playbook spreads globally. The number of Treasury companies may grow as well as each having larger buys. Tapers toward nominal GDP (real + inflation) over the horizon below."
        value={p.otherTreasuryGrowth}
        min={1}
        max={80}
        step={1}
        onChange={set("otherTreasuryGrowth")}
        fmt={(v) => `${v}%/yr`}
      />
      <Slider
        label="Other treasury growth taper horizon"
        hint="Years for other corporate BTC treasury USD growth to converge logistically to nominal GDP (real + inflation)."
        value={p.otherTreasuryGrowthTaperYears}
        min={5}
        max={50}
        step={1}
        onChange={set("otherTreasuryGrowthTaperYears")}
        fmt={(v) => `${v} yrs`}
      />
    </Section>
  );
}
