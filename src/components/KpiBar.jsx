import { YEAR_START } from "../sim/constants.js";
import { C, FONT_UI } from "../theme.js";
import { fmtUSD, formatSimRangeLabel } from "../utils/format.js";
import { KPI } from "./KPI.jsx";

export function KpiBar({ p, last, supplyShockYear, mult, floatCapInfo }) {
  const capKpi =
    floatCapInfo?.mode === "off"
      ? {
          value: "Off",
          sub: "Hoarding not limited by tradable liquid",
          highlight: false,
        }
      : floatCapInfo?.boundMonths > 0
        ? {
            value: `${floatCapInfo.boundMonths} / ${floatCapInfo.totalMonths} mo`,
            sub: `Peak ${floatCapInfo.maxRationPct.toFixed(0)}% of gross buy demand rationed`,
            highlight: true,
          }
        : {
            value: "Not binding",
            sub: "No rationing this run — paths match cap off until demand exceeds liquid room",
            highlight: false,
          };

  return (
    <div
      style={{
        padding: "12px 20px 10px",
        borderBottom: `1px solid ${C.border}`,
        background: "#0d0d0d",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: C.amberDim,
          fontFamily: FONT_UI,
          fontWeight: 500,
          marginBottom: 8,
        }}
      >
        Bitcoin Supply Shock Simulator &nbsp;·&nbsp; {formatSimRangeLabel(YEAR_START, p.simYears)}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <KPI
          label={`BTC Price · ${Math.floor(YEAR_START + p.simYears)}`}
          value={fmtUSD(last.price)}
          sub={`${mult.toFixed(1)}× from ${fmtUSD(p.startPrice)}`}
          highlight
        />
        <KPI label="Real Price · Infl-Adj" value={fmtUSD(last.priceReal)} sub={`at ${p.inflation}%/yr inflation`} />
        <KPI
          label="Liquid BTC Remaining"
          value={`${last.liquidM.toFixed(2)}M`}
          sub={`${last.liquidPct.toFixed(0)}% of initial pool`}
          warn={last.liquidPct < 15}
        />
        <KPI
          label="Supply Shock Year"
          value={supplyShockYear ? `~${Math.floor(supplyShockYear)}` : "None"}
          sub="Liquid BTC drops below 30% of start"
          warn={!!supplyShockYear}
        />
        {floatCapInfo && (
          <KPI
            label="Cap buying to float"
            value={capKpi.value}
            sub={capKpi.sub}
            highlight={capKpi.highlight}
          />
        )}
        <KPI
          label={`MSTR BTC/day · ${Math.floor(YEAR_START + p.simYears)}`}
          value={last.strcDayBtc.toLocaleString()}
          sub={`mining: ${last.dailyMining.toFixed(0)} BTC/day`}
        />
        <KPI
          label="Corp Treasury Total"
          value={`${last.treasuryM.toFixed(2)}M BTC`}
          sub={`${((last.treasuryM / (p.circulatingSupply / 1e6)) * 100).toFixed(0)}% of all mined`}
        />
      </div>
    </div>
  );
}
