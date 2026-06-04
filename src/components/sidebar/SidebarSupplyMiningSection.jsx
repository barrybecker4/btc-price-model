import { ALREADY_LOST_COINS_CAP_BTC } from "../../sim/config/constants.js";
import { MINING_COST_FLOOR_STEP } from "../../params/startPriceSlider.js";
import { fmtUSD } from "../../utils/format.js";
import { C, FONT_NUM, FONT_UI } from "../../theme.js";
import { Section } from "../Section.jsx";
import { Slider } from "../Slider.jsx";

export function SidebarSupplyMiningSection({
  p,
  setP,
  set,
  miningCostMin,
  miningCostMax,
  safeLostCoins,
  lostCoinsMax,
  effectiveSupply,
}) {
  return (
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
            alreadyLostCoins: Math.min(
              prev.alreadyLostCoins,
              Math.min(ALREADY_LOST_COINS_CAP_BTC, Math.floor(v * 0.9)),
            ),
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
  );
}
