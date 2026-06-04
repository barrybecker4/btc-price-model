import { nominalGdpGrowthPct } from "../../sim/macro/nominalGdp.js";
import { Section } from "../Section.jsx";
import { Slider } from "../Slider.jsx";

export function SidebarEtfSection({ p, set }) {
  const nominalGdp = nominalGdpGrowthPct(p.realGdpGrowth, p.inflation);
  return (
    <Section title="📈 ETFs" defaultOpen={false}>
      <Slider
        label="ETF Initial Holdings"
        value={p.etfInitialBtc}
        min={1400000}
        max={1900000}
        step={10000}
        onChange={set("etfInitialBtc")}
        fmt={(v) => `${(v / 1e6).toFixed(2)}M BTC`}
      />
      <Slider
        label="ETF Net Daily Inflow"
        hint="Net USD inflow per day across all spot BTC ETFs."
        value={p.etfDailyInflowM}
        min={0}
        max={500}
        step={5}
        onChange={set("etfDailyInflowM")}
        fmt={(v) => `$${v}M/day`}
      />
      <Slider
        label="ETF Inflow Growth"
        hint={`Annual growth of aggregate ETF USD inflow. Tapers toward nominal GDP (${nominalGdp.toFixed(1)}%/yr) over the horizon below.`}
        value={p.etfGrowthRate}
        min={0}
        max={60}
        step={1}
        onChange={set("etfGrowthRate")}
        fmt={(v) => `${v}%/yr`}
      />
      <Slider
        label="ETF Flow Volatility"
        hint="Small random month-to-month variation around normal ETF net inflows. Higher values make ETF demand less smooth and can occasionally create net outflow months."
        hintDetail="This is ordinary ETF flow noise, separate from BTC price noise and separate from the larger stress redemption events below. 0% keeps the normal ETF flow path smooth."
        value={p.etfFlowVolatilityPct}
        min={0}
        max={60}
        step={1}
        onChange={set("etfFlowVolatilityPct")}
        fmt={(v) => `${v}%/yr`}
      />
      <Slider
        label="ETF Stress Redemption Count"
        hint="Number of larger ETF sell events to spread across the simulation period."
        hintDetail="A stress redemption means ETF investors collectively redeem shares during a risk-off period, forcing ETF issuers or market makers to release/sell some BTC instead of absorbing BTC. 0 = no discrete ETF stress events; 1 = one event near the middle; 2–3 = events spaced throughout the simulation."
        value={p.etfStressRedemptionCount}
        min={0}
        max={3}
        step={1}
        onChange={set("etfStressRedemptionCount")}
        fmt={(v) => `${v} event${v === 1 ? "" : "s"}`}
      />
      <Slider
        label="ETF Stress Redemption Size"
        hint="Size of each ETF stress redemption event as a percentage of current ETF BTC holdings."
        hintDetail="For example, 2% means each stress event removes/sells 2% of the BTC currently held by ETFs in that month. Set the count above to 0 to disable these events."
        value={p.etfOutflowShockPct}
        min={0.1}
        max={10}
        step={0.1}
        onChange={set("etfOutflowShockPct")}
        fmt={(v) => `${v.toFixed(1)}%`}
      />
      <Slider
        label="ETF inflow growth taper horizon"
        hint="Years for ETF net USD inflow growth to converge logistically to nominal GDP (real + inflation, macro block)."
        value={p.etfGrowthTaperYears}
        min={5}
        max={50}
        step={1}
        onChange={set("etfGrowthTaperYears")}
        fmt={(v) => `${v} yrs`}
      />
      <Slider
        label="Inst. Allocation Cap"
        hint="Maximum share of total mined BTC that Strategy, other treasuries, and ETFs can hold together before new institutional buying is throttled."
        hintDetail="Prevents institutional demand from compounding forever as if balance sheets and AUM were unlimited."
        value={p.institutionalAllocationCapPct}
        min={15}
        max={70}
        step={1}
        onChange={set("institutionalAllocationCapPct")}
        fmt={(v) => `${v}% of mined BTC`}
      />
    </Section>
  );
}
