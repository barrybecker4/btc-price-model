import { C, FONT_UI } from "../../theme.js";
import { ParamHintHotspot } from "../ParamHintHotspot.jsx";
import { Section } from "../Section.jsx";
import { Slider } from "../Slider.jsx";

export function SidebarMarketDynamicsSection({ p, setP, set, closeParamHints, floatCapOn }) {
  return (
    <Section title="⚡ Market Dynamics" defaultOpen={false}>
      {/*
        Keep the checkbox outside ParamHintHotspot so hover/focus on the control does not open a
        full-width portal tooltip (z-index 10000) over the main chart area.
      */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          marginBottom: 12,
          fontSize: 12,
          color: C.text,
          fontFamily: FONT_UI,
        }}
      >
        <input
          id="sidebar-cap-buy-float"
          type="checkbox"
          checked={p.capBuyingToLiquidFloat !== false}
          onPointerDown={() => closeParamHints()}
          onChange={(e) => {
            closeParamHints();
            setP((prev) => ({ ...prev, capBuyingToLiquidFloat: e.target.checked }));
          }}
          style={{ accentColor: C.amber, cursor: "pointer", marginTop: 2, flexShrink: 0 }}
        />
        <label htmlFor="sidebar-cap-buy-float" style={{ flex: 1, cursor: "pointer", minWidth: 0 }}>
          <ParamHintHotspot
            focusable={false}
            ariaLabel="More about Cap buying to liquid float"
            hint="When on, monthly hoarding cannot exceed liquid (above floor) plus miner supply and net retail selling pressure. Demand is rationed proportionally across MSTR, other treasuries, ETF, and the retail buy leg (net USD → BTC)."
            style={{ cursor: "help", borderRadius: 2, lineHeight: 1.45 }}
          >
            <span>Cap buying to liquid float</span>
          </ParamHintHotspot>
        </label>
      </div>
      <Slider
        label="Unmet demand → price (scarcity premium)"
        hint="When buying is capped by liquid float, extra monthly return ∝ unmet BTC demand ÷ liquid, before the global monthly gain cap. Offsets mechanical bearish drift when executed net demand is negative but buyers are rationed."
        hintDetail={
          floatCapOn
            ? "Stacks with base elasticity but is still bounded by the max monthly gain slider."
            : "Inactive while “Cap buying to liquid float” is off — the model does not compute unmet hoarding in that mode."
        }
        value={p.unmetDemandPriceStrength}
        min={0}
        max={3}
        step={0.05}
        onChange={set("unmetDemandPriceStrength")}
        fmt={(v) => `${v.toFixed(2)}×`}
        disabled={!floatCapOn}
      />
      <Slider
        label="Max monthly % from unmet premium"
        hint="Ceiling on the scarcity-premium term alone (percent per month)."
        hintDetail={floatCapOn ? undefined : "Inactive while “Cap buying to liquid float” is off."}
        value={p.unmetPremiumMaxMonthlyPct}
        min={0}
        max={30}
        step={0.5}
        onChange={set("unmetPremiumMaxMonthlyPct")}
        fmt={(v) => `${v.toFixed(1)}%/mo`}
        disabled={!floatCapOn}
      />
      <Slider
        label="BTC Price Noise"
        hint="Random month-to-month BTC price noise around the supply/demand path. Set to 0% to remove this price-noise term entirely."
        hintDetail="The fade slider below only controls how this noise decays over the simulation. Other controls, like ETF stress outflows and halving-cycle effects, can still move the projected curve."
        value={p.initialAnnualVolatility}
        min={0}
        max={80}
        step={1}
        onChange={set("initialAnnualVolatility")}
        fmt={(v) => `${v}%/yr`}
      />
      <Slider
        label="BTC Noise Fade Over Time"
        hint="0% = same BTC price-noise amplitude every month. 100% = this noise starts at the slider value above and shrinks to ~0 by the final month."
        value={p.volatilityReduction}
        min={0}
        max={100}
        step={1}
        onChange={set("volatilityReduction")}
        fmt={(v) => `${v}%`}
      />
      <Slider
        label="Valuation Demand Drag"
        hint="How much planned USD demand cools as BTC trades above its 52-week moving average (12 trailing month-end closes in this model)."
        hintDetail="Multiplier = (52w MA ÷ current price)^exponent; the label is exponent × 100 (e.g. 20% → 0.2). No boost when price is below the MA. Early months use the start price until enough closes exist. Separate from momentum boost."
        value={p.priceSensitiveDemandElasticity}
        min={0}
        max={2}
        step={0.01}
        onChange={set("priceSensitiveDemandElasticity")}
        fmt={(v) => `${(v * 100).toFixed(0)}%`}
      />
      <Slider
        label="Momentum Demand Boost"
        hint="How strongly positive recent BTC returns increase treasury, ETF, and retail buy demand."
        hintDetail="A value of 1.25 means a +10% recent monthly momentum signal adds roughly +12.5% demand before the maximum boost cap."
        value={p.momentumDemandBoost}
        min={0}
        max={5}
        step={0.05}
        onChange={set("momentumDemandBoost")}
        fmt={(v) => `${v.toFixed(2)}×`}
      />
      <Slider
        label="Momentum Decay Window"
        hint="How many months recent returns continue to influence FOMO / trend-following demand."
        hintDetail="Shorter windows react quickly and fade quickly. Longer windows make momentum demand smoother and more persistent."
        value={p.momentumDecayMonths}
        min={1}
        max={24}
        step={1}
        onChange={set("momentumDecayMonths")}
        fmt={(v) => `${v} mo`}
      />
      <Slider
        label="Max Momentum Boost"
        hint="Hard cap on the extra demand multiplier created by positive price momentum."
        hintDetail="Prevents reflexive demand from exploding during very sharp rallies."
        value={p.maxMomentumBoostPct}
        min={0}
        max={300}
        step={5}
        onChange={set("maxMomentumBoostPct")}
        fmt={(v) => `+${v}%`}
      />
      <Slider
        label="Base Price Elasticity"
        hint="How much buyers ease up or pile in when the BTC price moves—think of it as “how price-sensitive are people?” Higher = they react more to the same price change. Default 1.1 is a middle-of-the-road guess."
        hintDetail="This dial also sets how big monthly price moves are for a given amount of net buying or selling. When there are fewer coins freely available, the same activity swings price more. If the float cap is on, the unmet-demand control can add extra lift when buying is rationed."
        value={p.baseElasticity}
        min={0.2}
        max={5}
        step={0.1}
        onChange={set("baseElasticity")}
        fmt={(v) => `${v.toFixed(1)}×`}
      />
      <Slider
        label="Max Monthly Price Gain"
        hint="Hard cap on upward monthly price change. 20% = potentially 792%/yr compounded at the peak. Lower values smooth the shock curve and extend the run over more years."
        value={p.maxMonthlyPctGain}
        min={5}
        max={50}
        step={1}
        onChange={set("maxMonthlyPctGain")}
        fmt={(v) => `${v}%/mo`}
      />
    </Section>
  );
}
