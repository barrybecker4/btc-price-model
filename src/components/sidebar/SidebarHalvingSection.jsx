import { Section } from "../Section.jsx";
import { Slider } from "../Slider.jsx";

export function SidebarHalvingSection({ p, set }) {
  return (
    <Section title="⛏ Halving cycle" defaultOpen={false}>
      <Slider
        label="4y cycle strength"
        hint="0–100% of a full halving-era boom/bust (bear leg calibrated to ~70% peak-to-trough vs a local top when structural demand is muted). Applied on top of fundamentals; at 100% the bear leg can dominate. Scales down each cycle by “impact decay”. 0% = off."
        hintDetail="A behavioral overlay on supply/demand fundamentals, not a replacement for them."
        value={p.halvingNarrativeAmp}
        min={0}
        max={1}
        step={0.01}
        onChange={set("halvingNarrativeAmp")}
        fmt={(v) => `${(v * 100).toFixed(0)}% of full cycle`}
      />
      <Slider
        label="Impact decay / halving"
        hint="After each 4-year halving, the narrative swing is multiplied by this factor vs the prior cycle (1.00 = same as before; lower = halving matters less over time)."
        value={p.halvingImpactDecay}
        min={0}
        max={1}
        step={0.01}
        onChange={set("halvingImpactDecay")}
        fmt={(v) => `${(v * 100).toFixed(0)}% of prior`}
      />
    </Section>
  );
}
