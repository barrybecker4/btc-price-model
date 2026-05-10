import { DEFAULTS } from "../sim/constants.js";
import {
  miningCostFloorBounds,
  START_PRICE_SLIDER_BASE_MAX,
  START_PRICE_SLIDER_BASE_MIN,
} from "../utils/startPriceSlider.js";
import { C, FONT_UI } from "../theme.js";
import { ParameterSidebarBlocks } from "./ParameterSidebarBlocks.jsx";

export function ParameterSidebar({
  p,
  setP,
  startPriceMin = START_PRICE_SLIDER_BASE_MIN,
  startPriceMax = START_PRICE_SLIDER_BASE_MAX,
}) {
  const set = (k) => (v) => setP((prev) => ({ ...prev, [k]: v }));

  const { min: miningCostMin, max: miningCostMax } = miningCostFloorBounds(p.startPrice);

  const lostCoinsMax = Math.min(7_000_000, Math.floor(p.circulatingSupply * 0.9));
  const safeLostCoins = Math.min(p.alreadyLostCoins, lostCoinsMax);
  const effectiveSupply = p.circulatingSupply - safeLostCoins;
  const strcInitialDayBtc = Math.round((p.strcInitialUsdB * 1e9) / 365 / Math.max(p.startPrice, 1));

  const closeParamHints = () => window.dispatchEvent(new Event("close-param-hints"));

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
      <ParameterSidebarBlocks
        p={p}
        setP={setP}
        set={set}
        startPriceMin={startPriceMin}
        startPriceMax={startPriceMax}
        miningCostMin={miningCostMin}
        miningCostMax={miningCostMax}
        safeLostCoins={safeLostCoins}
        lostCoinsMax={lostCoinsMax}
        effectiveSupply={effectiveSupply}
        strcInitialDayBtc={strcInitialDayBtc}
        closeParamHints={closeParamHints}
        floatCapOn={floatCapOn}
      />
    </div>
  );
}
