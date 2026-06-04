import { nominalGdpGrowthPct } from "../../sim/macro/nominalGdp.js";
import { Section } from "../Section.jsx";
import { Slider } from "../Slider.jsx";

export function SidebarOrganicSection({ p, set }) {
  const nominalGdp = nominalGdpGrowthPct(p.realGdpGrowth, p.inflation);
  return (
    <Section title="👥 Organic Market" defaultOpen={false}>
      <Slider
        label="Initial Retail Purchase Rate"
        hint="Net USD demand from retail, per calendar day ($M). Positive = net buying; negative = net selling pressure. Dollar-denominated so the path does not fix an unsustainable BTC/day against finite float."
        value={p.initialRetailPurchaseRateM}
        min={-30}
        max={60}
        step={1}
        onChange={set("initialRetailPurchaseRateM")}
        fmt={(v) => {
          const sign = v < 0 ? "−" : "";
          return `${sign}$${Math.abs(v)}M/day`;
        }}
      />
      <Slider
        label="Retail Buy Growth"
        hint={`Annual growth of net retail USD demand. Logistic taper (below) converges toward nominal GDP (${nominalGdp.toFixed(1)}%/yr).`}
        value={p.organicBuyGrowth}
        min={0}
        max={30}
        step={1}
        onChange={set("organicBuyGrowth")}
        fmt={(v) => `${v}%/yr`}
      />
      <Slider
        label="Retail growth taper horizon"
        hint="Years for retail USD demand growth to converge logistically to nominal GDP (real + inflation, macro block), avoiding unbounded compounding at the slider rate."
        value={p.organicBuyGrowthTaperYears}
        min={5}
        max={50}
        step={1}
        onChange={set("organicBuyGrowthTaperYears")}
        fmt={(v) => `${v} yrs`}
      />
    </Section>
  );
}
