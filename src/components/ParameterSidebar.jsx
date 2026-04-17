import { DEFAULTS } from "../sim/constants.js";
import { C, FONT_HEAD, FONT_NUM, FONT_UI } from "../theme.js";
import { fmtUSD } from "../utils/format.js";
import { Section } from "./Section.jsx";
import { Slider } from "./Slider.jsx";

export function ParameterSidebar({ p, setP }) {
  const set = (k) => (v) => setP((prev) => ({ ...prev, [k]: v }));

  const safeLostCoins = Math.min(p.alreadyLostCoins, p.circulatingSupply * 0.9);
  const effectiveSupply = p.circulatingSupply - safeLostCoins;
  const strcYield = (p.bondYield + 7).toFixed(1);
  const strcInitialDayBtc = Math.round((p.strcInitialUsdB * 1e9) / 365 / p.startPrice);

  return (
    <div
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
        <Slider label="Simulation Period" value={p.simYears} min={5} max={25} step={1} onChange={set("simYears")} fmt={(v) => `${v} yrs`} />
        <Slider label="Starting BTC Price" value={p.startPrice} min={50000} max={250000} step={5000} onChange={set("startPrice")} fmt={fmtUSD} />
        <Slider label="10yr Bond Yield" value={p.bondYield} min={2} max={10} step={0.1} onChange={set("bondYield")} fmt={(v) => `${v.toFixed(1)}%`} />
        <Slider label="USD Inflation Rate" value={p.inflation} min={1} max={15} step={0.1} onChange={set("inflation")} fmt={(v) => `${v.toFixed(1)}%/yr`} />
        <Slider
          label="Nominal GDP Growth"
          hint="Global nominal GDP growth (real GDP + inflation). Applied as an extra monthly multiplier to ALL USD-denominated demand flows — simulating money-supply expansion. Higher GDP → more capital chasing BTC → the price curve continues rising rather than plateauing."
          value={p.gdpGrowth}
          min={1}
          max={12}
          step={0.1}
          onChange={set("gdpGrowth")}
          fmt={(v) => `${v.toFixed(1)}%/yr`}
        />
      </Section>

      <Section title="⛏ Supply &amp; Mining">
        <Slider
          label="Total BTC Ever Mined"
          hint="All mined BTC including lost coins (~19.85M today). Hard cap = 21M. This is NOT the effective liquid supply — lost coins must be subtracted below."
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
          fmt={(v) => `${(v / 1e6).toFixed(3)}M`}
        />
        <Slider
          label="Already-Lost Coins"
          hint="Permanently inaccessible subset of above: Satoshi wallet (~1.1M), lost keys, burned coins. Effective liquid supply = Total Mined − Lost."
          value={safeLostCoins}
          min={500000}
          max={Math.floor(p.circulatingSupply * 0.9)}
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
          value={p.annualLossRate}
          min={0.05}
          max={0.5}
          step={0.05}
          onChange={set("annualLossRate")}
          fmt={(v) => `${v.toFixed(2)}%/yr`}
        />
        <Slider
          label="Miner Sell Pressure"
          hint="% of newly mined BTC immediately sold by miners to cover costs."
          value={p.minerSellPct}
          min={50}
          max={100}
          step={1}
          onChange={set("minerSellPct")}
          fmt={(v) => `${v}%`}
        />
        <Slider
          label="Mining Cost Floor"
          hint="All-in production cost floor. Price cannot fall below this level."
          value={p.miningCostFloor}
          min={20000}
          max={150000}
          step={1000}
          onChange={set("miningCostFloor")}
          fmt={fmtUSD}
        />
      </Section>

      <Section title="🏦 Strategy / MSTR">
        <Slider
          label="Initial BTC Holdings"
          value={p.strcInitialBtc}
          min={100000}
          max={1000000}
          step={10000}
          onChange={set("strcInitialBtc")}
          fmt={(v) => `${(v / 1000).toFixed(0)}K BTC`}
        />
        <Slider
          label="Initial Annual USD Purchase Rate"
          hint="Strategy's BTC acquisition spend at t=0 (annualized). This is the starting rate — grows each year at the rate below."
          value={p.strcInitialUsdB}
          min={5}
          max={300}
          step={5}
          onChange={set("strcInitialUsdB")}
          fmt={(v) => `$${v}B/yr`}
        />
        <Slider
          label="Annual Capital Raise Growth"
          hint={`Rate at which Strategy grows its USD capital raises annually. Minimum realistic floor = inflation rate (${p.inflation.toFixed(1)}%). Strategy has historically grown well above this via convertible notes and ATM offerings.`}
          value={p.strcGrowthRate}
          min={Math.ceil(p.inflation)}
          max={80}
          step={1}
          onChange={set("strcGrowthRate")}
          fmt={(v) => `${v}%/yr`}
        />
      </Section>

      <Section title="🏢 Other Treasuries &amp; ETFs" open={false}>
        <Slider
          label="Other Corp. Initial Holdings"
          value={p.otherInitialBtc}
          min={0}
          max={500000}
          step={10000}
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
          hint="Catching up as playbook spreads globally."
          value={p.otherTreasuryGrowth}
          min={0}
          max={100}
          step={5}
          onChange={set("otherTreasuryGrowth")}
          fmt={(v) => `${v}%/yr`}
        />
        <Slider
          label="ETF Initial Holdings"
          value={p.etfInitialBtc}
          min={500000}
          max={3000000}
          step={50000}
          onChange={set("etfInitialBtc")}
          fmt={(v) => `${(v / 1e6).toFixed(2)}M BTC`}
        />
        <Slider
          label="ETF Net Daily Inflow"
          hint="Net USD inflow per day across all spot BTC ETFs."
          value={p.etfDailyInflowM}
          min={0}
          max={2000}
          step={10}
          onChange={set("etfDailyInflowM")}
          fmt={(v) => `$${v}M/day`}
        />
        <Slider label="ETF Inflow Growth" value={p.etfGrowthRate} min={0} max={50} step={2} onChange={set("etfGrowthRate")} fmt={(v) => `${v}%/yr`} />
      </Section>

      <Section title="👥 Organic Market" open={false}>
        <Slider label="Retail Daily Buying" value={p.organicDailyBuy} min={0} max={2000} step={50} onChange={set("organicDailyBuy")} fmt={(v) => `${v} BTC/day`} />
        <Slider label="Retail Daily Selling" value={p.organicDailySell} min={0} max={3000} step={50} onChange={set("organicDailySell")} fmt={(v) => `${v} BTC/day`} />
        <Slider label="Retail Buy Growth" value={p.organicBuyGrowth} min={0} max={30} step={1} onChange={set("organicBuyGrowth")} fmt={(v) => `${v}%/yr`} />
        <Slider
          label="HODLer Sell Decline"
          hint="Annual % reduction in retail selling as scarcity narrative hardens and price rises."
          value={p.organicSellDecline}
          min={0}
          max={20}
          step={1}
          onChange={set("organicSellDecline")}
          fmt={(v) => `${v}%/yr`}
        />
      </Section>

      <Section title="🔐 Holders (LTH / Ancient)" open={false}>
        <Slider
          label="LTH 155d+ share of float"
          hint="Share of BTC outside Lost, treasuries & ETFs modeled as long-term holders (155d+ total, including Ancient). Range 60–80%; default ~73%. Ancient is nested inside this total."
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
          min={-10}
          max={10}
          step={0.1}
          onChange={set("flowLiquidToLth155Annual")}
          fmt={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} %/yr`}
        />
        <Slider
          label="Flow: liquid → Ancient"
          hint="Signed annual rate: positive = % of current liquid per year locking into Ancient; negative = Ancient selling to liquid (% of Ancient stock per year)."
          value={p.flowLiquidToAncientAnnual}
          min={-10}
          max={10}
          step={0.1}
          onChange={set("flowLiquidToAncientAnnual")}
          fmt={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} %/yr`}
        />
      </Section>

      <Section title="⛏ Halving cycle" open={false}>
        <Slider
          label="4y cycle strength"
          hint="0–100% of a full halving-era boom/bust (bear leg calibrated to ~70% peak-to-trough vs a local top when structural demand is muted). Applied on top of fundamentals; at 100% the bear leg can dominate. Scales down each cycle by “impact decay”. 0% = off."
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
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: C.text,
            fontFamily: FONT_UI,
            marginBottom: 12,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={p.capBuyingToLiquidFloat !== false}
            onChange={(e) => setP((prev) => ({ ...prev, capBuyingToLiquidFloat: e.target.checked }))}
            style={{ accentColor: C.amber }}
          />
          <span>
            Cap buying to liquid float
            <span style={{ display: "block", fontSize: 10, color: C.hint, marginTop: 3, fontWeight: 400 }}>
              When on, monthly hoarding cannot exceed liquid (above floor) plus miner/organic inflows. Demand is rationed proportionally across MSTR, other treasuries, ETF, and retail.
            </span>
          </span>
        </label>
        <Slider
          label="Unmet demand → price (scarcity premium)"
          hint="When buying is capped by liquid float, extra monthly return ∝ unmet BTC demand ÷ liquid, before the global monthly gain cap. Offsets mechanical bearish drift when executed net demand is negative but buyers are rationed."
          value={p.unmetDemandPriceStrength}
          min={0}
          max={3}
          step={0.05}
          onChange={set("unmetDemandPriceStrength")}
          fmt={(v) => `${v.toFixed(2)}×`}
        />
        <Slider
          label="Max monthly % from unmet premium"
          hint="Ceiling on the scarcity-premium term alone (percent per month)."
          value={p.unmetPremiumMaxMonthlyPct}
          min={0}
          max={20}
          step={0.5}
          onChange={set("unmetPremiumMaxMonthlyPct")}
          fmt={(v) => `${v.toFixed(1)}%/mo`}
        />
        <Slider
          label="Initial annual volatility"
          hint="Roughly how violent monthly moves are around the supply/demand path (spot BTC is often ~60–80% annualized vs ~10% bonds / ~20% equities). Applied as scaled monthly noise; fades over time per the next slider."
          value={p.initialAnnualVolatility}
          min={10}
          max={80}
          step={1}
          onChange={set("initialAnnualVolatility")}
          fmt={(v) => `${v}%/yr`}
        />
        <Slider
          label="Volatility fade over time"
          hint="0% = same noise amplitude every month. 100% = noise shrinks to ~0 by the last month of the simulation. Default 90% means most of the extra chop is early."
          value={p.volatilityReduction}
          min={0}
          max={100}
          step={1}
          onChange={set("volatilityReduction")}
          fmt={(v) => `${v}%`}
        />
        <Slider
          label="Base Price Elasticity"
          hint="Sensitivity of price to net buy/sell imbalance, relative to liquid supply. At 1.0×, a 1% net demand imbalance moves price 1% — before the scarcity amplifier. As liquid supply shrinks (thin order book), this multiplier amplifies: 1% imbalance on 5% remaining supply creates a ~20× larger move. Higher base = more violent shock. Lower = smoother repricing."
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
          ["STRC Yield (bond + 7%)", `${strcYield}%`, C.amber],
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
