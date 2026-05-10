import { SidebarEtfSection } from "./sidebar/SidebarEtfSection.jsx";
import { SidebarHalvingSection } from "./sidebar/SidebarHalvingSection.jsx";
import { SidebarHeader } from "./sidebar/SidebarHeader.jsx";
import { SidebarHoldersSection } from "./sidebar/SidebarHoldersSection.jsx";
import { SidebarMacroSection } from "./sidebar/SidebarMacroSection.jsx";
import { SidebarMarketDynamicsSection } from "./sidebar/SidebarMarketDynamicsSection.jsx";
import { SidebarOrganicSection } from "./sidebar/SidebarOrganicSection.jsx";
import { SidebarOtherTreasuriesSection } from "./sidebar/SidebarOtherTreasuriesSection.jsx";
import { SidebarStatsAndReset } from "./sidebar/SidebarStatsAndReset.jsx";
import { SidebarStrategySection } from "./sidebar/SidebarStrategySection.jsx";
import { SidebarSupplyMiningSection } from "./sidebar/SidebarSupplyMiningSection.jsx";

/** Sidebar form sections (split from ParameterSidebar for maintainability). */
export function ParameterSidebarBlocks({
  p,
  setP,
  set,
  startPriceMin,
  startPriceMax,
  miningCostMin,
  miningCostMax,
  safeLostCoins,
  lostCoinsMax,
  effectiveSupply,
  strcInitialDayBtc,
  closeParamHints,
  floatCapOn,
}) {
  return (
    <>
      <SidebarHeader />
      <SidebarMacroSection
        p={p}
        setP={setP}
        set={set}
        startPriceMin={startPriceMin}
        startPriceMax={startPriceMax}
      />
      <SidebarSupplyMiningSection
        p={p}
        setP={setP}
        set={set}
        miningCostMin={miningCostMin}
        miningCostMax={miningCostMax}
        safeLostCoins={safeLostCoins}
        lostCoinsMax={lostCoinsMax}
        effectiveSupply={effectiveSupply}
      />
      <SidebarStrategySection p={p} set={set} />
      <SidebarOtherTreasuriesSection p={p} set={set} />
      <SidebarEtfSection p={p} set={set} />
      <SidebarOrganicSection p={p} set={set} />
      <SidebarHoldersSection p={p} set={set} />
      <SidebarHalvingSection p={p} set={set} />
      <SidebarMarketDynamicsSection
        p={p}
        setP={setP}
        set={set}
        closeParamHints={closeParamHints}
        floatCapOn={floatCapOn}
      />
      <SidebarStatsAndReset
        strcInitialDayBtc={strcInitialDayBtc}
        effectiveSupply={effectiveSupply}
        setP={setP}
      />
    </>
  );
}
