import { DEFAULTS } from "../sim/constants.js";
import {
  MINING_COST_FLOOR_STEP,
  miningCostFloorBounds,
  START_PRICE_SLIDER_BASE_MAX,
  START_PRICE_SLIDER_BASE_MIN,
  START_PRICE_SLIDER_STEP,
} from "../utils/startPriceSlider.js";
import { C, FONT_HEAD, FONT_NUM, FONT_UI } from "../theme.js";
import { fmtUSD } from "../utils/format.js";
import { ParamHintHotspot } from "./ParamHintHotspot.jsx";
import { Section } from "./Section.jsx";
import { Slider } from "./Slider.jsx";

export function ParameterSidebar({
  p,
  setP,
  startPriceMin = START_PRICE_SLIDER_BASE_MIN,
  startPriceMax = START_PRICE_SLIDER_BASE_MAX,
}) {
  const set = (k) => (v) => setP((prev) => ({ ...prev, [k]: v }));

  const { min: miningCostMin, max: miningCostMax } = miningCostFloorBounds(p.startPrice);

  const safeLostCoins = Math.min(p.alreadyLostCoins, p.circulatingSupply * 0.9);
  const lostCoinsMax = Math.min(7000000, Math.floor(p.circulatingSupply * 0.9));
  const effectiveSupply = p.circulatingSupply - safeLostCoins;
  const strcInitialDayBtc = Math.round((p.strcInitialUsdB * 1e9) / 365 / p.startPrice);

  const closeParamHints = () => window.dispatchEvent(new Event("close-param-hints"));

  /** Unmet-demand premium sliders only run in `runSim` when the float cap is on (`capOn`). */
  const floatCapOn = p.capBuyingToLiquidFloat !== false;

  return (
    <div
      onScroll={closeParamHints}
      style={{
        width: 300,
        minWidth: 300,
        background: C.panel,
        borderRight: `1px solid ${C.border}`,
        overflowY: "auto",
        padding: "12px 10px",
        scrollbarWidth: "thin",
        scrollbarColor: "#222 transparent",
      }}
    >
      <div
        style={{
          textAlign: "center",
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div style={{ fontSize: 19, fontWeight: 700, color: C.amber, fontFamily: FONT_HEAD }}>₿ Supply Shock Model</div>
        <div style={{ fontSize: 10, color: C.hint, marginTop: 4, letterSpacing: "0.1em", fontFamily: FONT_UI }}>
          ADJUST PARAMETERS BELOW
        </div>
      </div>

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
      </Section>

      <Section title="⛏ Supply &amp; Mining">
        <Slider
          label="Total BTC Mined"
          hint="All mined BTC including lost coins (~19.85M today). Hard cap = 21M. This is NOT the effective liquid supply — lost coins must be subtracted below."
          hintDetail="The sim treats this as gross mined supply before subtracting lost coins for float and demand math."
          value={p.circulatingSupply}
          min={19000000}
          max={21000000}
          step={50000}
          onChange={(v) => {
            setP((prev) => ({
              ...prev,
              circulatingSupply: v,
              alreadyLostCoins: Math.min(prev.alreadyLostCoins, v * 0.9),
            }));
          }}
          fmt={(v) => `${(v / 1e6).toFixed(2)}M`}
        />
        <Slider
          label="Already-Lost Coins"
          hint="Permanently inaccessible subset of above: Satoshi wallet (~1.1M), lost keys, burned coins. Effective liquid supply = Total Mined − Lost."
          hintDetail="Lost is removed before treasuries, ETFs, and LTH/Ancient splits, so those coins never enter the modeled tradable float."
          value={safeLostCoins}
          min={1000000}
          max={lostCoinsMax}
          step={100000}
          onChange={set("alreadyLostCoins")}
          fmt={(v) => `${(v / 1e6).toFixed(2)}M`}
        />
        <div
          style={{
            fontSize: 12,
            color: C.green,
            fontFamily: FONT_UI,
            fontWeight: 600,
            marginBottom: 10,
            marginTop: -4,
            padding: "3px 0",
          }}
        >
          Effective supply:{" "}
          <span style={{ fontFamily: FONT_NUM, fontVariantNumeric: "tabular-nums" }}>
            {(effectiveSupply / 1e6).toFixed(2)}M BTC
          </span>
        </div>
        <Slider
          label="Annual Coin Loss Rate"
          hint="% of liquid BTC lost per year going forward."
          hintDetail="Drain applies to the liquid bucket each year (stylized ongoing loss)."
          value={p.annualLossRate}
          min={0.05}
          max={3}
          step={0.01}
          onChange={set("annualLossRate")}
          fmt={(v) => `${v.toFixed(2)}%/yr`}
        />
        <Slider
          label="Miner Sell Pressure"
          hint="% of newly mined BTC immediately sold by miners to cover costs."
          value={p.minerSellPct}
          min={30}
          max={90}
          step={1}
          onChange={set("minerSellPct")}
          fmt={(v) => `${v}%`}
        />
        <Slider
          label="Mining Cost Floor"
          hint="This floor represents the average production cost (energy and overhead) for publicly traded miners. The cost floor differs significantly based on hardware efficiency and energy prices. When Bitcoin’s market price falls below this average mining cost, it often signals a bottom as inefficient miners are forced to pause operations."
          hintDetail="In the model, nominal price cannot fall below this level (a simplified floor vs. spot)."
          value={p.miningCostFloor}
          min={miningCostMin}
          max={miningCostMax}
          step={MINING_COST_FLOOR_STEP}
          onChange={set("miningCostFloor")}
          fmt={fmtUSD}
        />
      </Section>

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
          hint={`Rate at which Strategy grows its USD capital raises annually. Logistic taper (below) converges this toward Nominal GDP (${p.gdpGrowth.toFixed(1)}%/yr). Strategy has historically grown well above inflation via convertible notes and ATM offerings.`}
          value={p.strcGrowthRate}
          min={5}
          max={50}
          step={1}
          onChange={set("strcGrowthRate")}
          fmt={(v) => `${v}%/yr`}
        />
        <Slider
          label="MSTR growth taper horizon"
          hint="Years over which capital-raise growth logistically tapers to the Nominal GDP Growth rate (macro block). Shorter = faster convergence to GDP pace."
          value={p.strcGrowthTaperYears}
          min={5}
          max={70}
          step={1}
          onChange={set("strcGrowthTaperYears")}
          fmt={(v) => `${v} yrs`}
        />
      </Section>

      <Section title="🏢 Other Treasuries" open={false}>
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
          hint="Catching up as playbook spreads globally. The number of Treasury companies may grow as well as each having larger buys. Tapers toward Nominal GDP over the horizon below."
          value={p.otherTreasuryGrowth}
          min={1}
          max={80}
          step={1}
          onChange={set("otherTreasuryGrowth")}
          fmt={(v) => `${v}%/yr`}
        />
        <Slider
          label="Other treasury growth taper horizon"
          hint="Years for other corporate BTC treasury USD growth to converge logistically to Nominal GDP Growth."
          value={p.otherTreasuryGrowthTaperYears}
          min={5}
          max={50}
          step={1}
          onChange={set("otherTreasuryGrowthTaperYears")}
          fmt={(v) => `${v} yrs`}
        />
      </Section>

      <Section title="📈 ETFs" open={false}>
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
          hint="Annual growth of aggregate ETF USD inflow. Tapers toward Nominal GDP over the horizon below."
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
          hint="Years for ETF net USD inflow growth to converge logistically to Nominal GDP Growth."
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

      <Section title="👥 Organic Market" open={false}>
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
          hint={`Annual growth of net retail USD demand. Logistic taper (below) converges toward Nominal GDP (${p.gdpGrowth.toFixed(1)}%/yr).`}
          value={p.organicBuyGrowth}
          min={0}
          max={30}
          step={1}
          onChange={set("organicBuyGrowth")}
          fmt={(v) => `${v}%/yr`}
        />
        <Slider
          label="Retail growth taper horizon"
          hint="Years for retail USD demand growth to converge logistically to Nominal GDP Growth (macro block), avoiding unbounded compounding at the slider rate."
          value={p.organicBuyGrowthTaperYears}
          min={5}
          max={50}
          step={1}
          onChange={set("organicBuyGrowthTaperYears")}
          fmt={(v) => `${v} yrs`}
        />
      </Section>

      <Section title="🔐 Holders (LTH / Ancient)" open={false}>
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

      <Section title="⛏ Halving cycle" open={false}>
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

      <Section title="⚡ Market Dynamics" open={false}>
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
            type="checkbox"
            checked={p.capBuyingToLiquidFloat !== false}
            onPointerDown={() => closeParamHints()}
            onChange={(e) => {
              closeParamHints();
              setP((prev) => ({ ...prev, capBuyingToLiquidFloat: e.target.checked }));
            }}
            style={{ accentColor: C.amber, cursor: "pointer", marginTop: 2, flexShrink: 0 }}
          />
          <ParamHintHotspot
            focusable={false}
            ariaLabel="More about Cap buying to liquid float"
            hint="When on, monthly hoarding cannot exceed liquid (above floor) plus miner supply and net retail selling pressure. Demand is rationed proportionally across MSTR, other treasuries, ETF, and the retail buy leg (net USD → BTC)."
            style={{ flex: 1, cursor: "help", borderRadius: 2, minWidth: 0, lineHeight: 1.45 }}
          >
            <span>Cap buying to liquid float</span>
          </ParamHintHotspot>
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
          hintDetail={
            floatCapOn
              ? undefined
              : "Inactive while “Cap buying to liquid float” is off."
          }
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
          hintDetail="Multiplier = (52w MA ÷ current price)^exponent; the label is exponent × 100 (e.g. 1% → 0.01). No boost when price is below the MA. Early months use the start price until enough closes exist. Separate from momentum boost."
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

      <div
        style={{
          marginTop: 10,
          padding: "10px 11px",
          background: "#0d0d0d",
          border: `1px solid ${C.border}`,
          borderRadius: 3,
          fontFamily: FONT_UI,
        }}
      >
        {[
          ["Initial MSTR BTC/day", strcInitialDayBtc.toLocaleString(), C.text],
          ["vs mining output", "450 BTC/day", C.green],
          ["Demand ratio", `${(strcInitialDayBtc / 450).toFixed(1)}×`, C.red],
          ["Effective supply", `${(effectiveSupply / 1e6).toFixed(2)}M BTC`, C.text],
        ].map(([lbl, val, col]) => (
          <div key={lbl} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, lineHeight: 2.05 }}>
            <span style={{ color: C.hint }}>{lbl}:</span>
            <span
              style={{
                color: col,
                fontWeight: col !== C.text ? 700 : 400,
                fontFamily: FONT_NUM,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {val}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setP(DEFAULTS)}
        style={{
          width: "100%",
          marginTop: 10,
          padding: "7px 0",
          background: "transparent",
          border: `1px solid ${C.border}`,
          borderRadius: 3,
          color: C.dim,
          cursor: "pointer",
          fontSize: 10,
          fontFamily: FONT_UI,
          letterSpacing: "0.08em",
        }}
      >
        ↺ RESET TO DEFAULTS
      </button>
    </div>
  );
}
