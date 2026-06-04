import { miningCostFloorBounds, START_PRICE_SLIDER_STEP } from "../../params/startPriceSlider.js";
import { fmtUSD } from "../../utils/format.js";
import { Section } from "../Section.jsx";
import { Slider } from "../Slider.jsx";

export function SidebarMacroSection({ p, setP, set, startPriceMin, startPriceMax }) {
  return (
    <Section title="◈ Macroeconomic">
      <Slider
        label="Simulation Period"
        hint="Number of years for the prediction model to run, starting from the current date."
        value={p.simYears}
        min={5}
        max={25}
        step={1}
        onChange={set("simYears")}
        fmt={(v) => `${v} yrs`}
      />
      <Slider
        label="Starting BTC Price"
        hint="Initial price is set from the actual current price, but you can adjust it."
        hintDetail="On load, the app pulls a live BTC/USD quote for the default; the slider overrides that value."
        value={p.startPrice}
        min={startPriceMin}
        max={startPriceMax}
        step={START_PRICE_SLIDER_STEP}
        onChange={(v) => {
          setP((prev) => {
            const { min: mn, max: mx } = miningCostFloorBounds(v);
            let mcf = prev.miningCostFloor;
            if (mcf < mn) mcf = mn;
            if (mcf > mx) mcf = mx;
            return { ...prev, startPrice: v, miningCostFloor: mcf };
          });
        }}
        fmt={fmtUSD}
      />
      <Slider
        label="USD Inflation Rate"
        hint="Expected annual rise in the general price level in the United States — the percentage by which a broad basket of goods and services becomes more expensive over a year (the same idea headline CPI inflation measures)."
        hintDetail="Used for projected real-price paths in the simulation and SPY projection. Historical inflation adjustment uses fixed CPI-U data."
        value={p.inflation}
        min={1}
        max={15}
        step={0.1}
        onChange={set("inflation")}
        fmt={(v) => `${v.toFixed(1)}%/yr`}
      />
      <Slider
        label="Nominal GDP Growth"
        hint="Global nominal GDP growth (real GDP + inflation). Applied as an extra monthly multiplier to ALL USD-denominated demand flows — simulating money-supply expansion. Higher GDP → more capital chasing BTC."
        hintDetail="Does not scale BTC-denominated paths (e.g. block rewards); it biases USD flows that chase the float."
        value={p.gdpGrowth}
        min={1}
        max={20}
        step={0.1}
        onChange={set("gdpGrowth")}
        fmt={(v) => `${v.toFixed(1)}%/yr`}
      />
      <Slider
        label="AI productivity uplift"
        hint="Extra annual nominal growth from AI/productivity. Lifts S&P earnings assumptions and models wealth flowing into BTC demand (especially retail), on top of Nominal GDP."
        hintDetail="Adds to GDP for the SPY overlay macro path. In the BTC sim, treasury raises still taper to GDP only; retail gets the full uplift and ETFs half."
        value={p.aiProductivityPct}
        min={0}
        max={5}
        step={0.1}
        onChange={set("aiProductivityPct")}
        fmt={(v) => `${v.toFixed(1)}%/yr`}
      />
    </Section>
  );
}
