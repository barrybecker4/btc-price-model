import { miningCostFloorBounds, START_PRICE_SLIDER_STEP } from "../../params/startPriceSlider.js";
import { nominalGdpGrowthPct } from "../../sim/macro/nominalGdp.js";
import { fmtUSD } from "../../utils/format.js";
import { Section } from "../Section.jsx";
import { Slider } from "../Slider.jsx";

export function SidebarMacroSection({ p, setP, set, startPriceMin, startPriceMax }) {
  const nominalGdp = nominalGdpGrowthPct(p.realGdpGrowth, p.inflation);

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
        hintDetail="BTC: dashed = sim path in today's dollars; solid = that path with inflation compounded on top. SPY: dashed = macro real return (nominal GDP minus inflation); solid = earnings path plus inflation compounding. Historical segments use fixed CPI-U."
        value={p.inflation}
        min={1}
        max={15}
        step={0.1}
        onChange={set("inflation")}
        fmt={(v) => `${v.toFixed(1)}%/yr`}
      />
      <Slider
        label="Real GDP Growth"
        hint="Global real GDP growth — output volume after stripping inflation. USD demand flows (treasury, ETF, retail) taper toward nominal GDP, which equals real GDP plus inflation."
        hintDetail={`Nominal GDP used for USD flows: ${nominalGdp.toFixed(1)}%/yr (${p.realGdpGrowth.toFixed(1)}% real + ${p.inflation.toFixed(1)}% inflation). Does not scale BTC-denominated paths (e.g. block rewards).`}
        value={p.realGdpGrowth}
        min={-5}
        max={12}
        step={0.1}
        onChange={set("realGdpGrowth")}
        fmt={(v) => `${v.toFixed(1)}%/yr`}
      />
    </Section>
  );
}
