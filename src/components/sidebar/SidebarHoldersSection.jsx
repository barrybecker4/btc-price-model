import { Section } from "../Section.jsx";
import { Slider } from "../Slider.jsx";

export function SidebarHoldersSection({ p, set }) {
  return (
    <Section title="🔐 Holders (LTH / Ancient)" defaultOpen={false}>
      <Slider
        label="LTH 155d+ share of float"
        hint="Share of BTC outside Lost, treasuries & ETFs modeled as long-term holders (155d+ total, including Ancient). Range 60–80%; default ~73%. Ancient is nested inside this total."
        hintDetail="Young LTH plus Ancient equals this share of the modeled float; liquid is what remains after the split."
        value={p.lth155SharePct}
        min={60}
        max={80}
        step={1}
        onChange={set("lth155SharePct")}
        fmt={(v) => `${v}%`}
      />
      <Slider
        label="Ancient (7y+) share of float"
        hint="Share of that same non-treasury / non-ETF / non-lost pool that is Ancient (7y+). Must be ≤ LTH 155d+ total; Satoshi-like coins in Already-Lost are not double-counted here."
        hintDetail="If Ancient% × float would exceed the LTH cap, the model clamps so Ancient stays inside the LTH total."
        value={p.ancientSharePct}
        min={15}
        max={20}
        step={1}
        onChange={set("ancientSharePct")}
        fmt={(v) => `${v}%`}
      />
      <Slider
        label="Flow: liquid → LTH (155d+)"
        hint="Signed annual rate: positive = % of current liquid per year locking into young LTH; negative = young LTH distributing back to liquid (% of young LTH stock per year)."
        value={p.flowLiquidToLth155Annual}
        min={-5}
        max={5}
        step={0.1}
        onChange={set("flowLiquidToLth155Annual")}
        fmt={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} %/yr`}
      />
      <Slider
        label="Flow: liquid → Ancient"
        hint="Signed annual rate: positive = % of current liquid per year locking into Ancient; negative = Ancient selling to liquid (% of Ancient stock per year)."
        value={p.flowLiquidToAncientAnnual}
        min={-5}
        max={5}
        step={0.1}
        onChange={set("flowLiquidToAncientAnnual")}
        fmt={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} %/yr`}
      />
      <Slider
        label="LTH Profit Distribution"
        hint="Extra annual selling from young LTH and Ancient holders when BTC trades far above its 52-week moving average (12 trailing month-end closes in this model)."
        hintDetail="Scales from 0 at the MA toward the slider rate around a 3× price vs that average, adding coins back to liquid float."
        value={p.lthProfitDistributionAnnualPct}
        min={0}
        max={5}
        step={0.1}
        onChange={set("lthProfitDistributionAnnualPct")}
        fmt={(v) => `${v.toFixed(1)}%/yr`}
      />
    </Section>
  );
}
