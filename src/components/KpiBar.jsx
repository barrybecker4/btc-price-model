import { YEAR_START } from "../sim/constants.js";
import { C, FONT_UI } from "../theme.js";
import { fmtUSD, formatSimRangeLabel } from "../utils/format.js";
import { KPI } from "./KPI.jsx";

export function KpiBar({ p, last, supplyShockYear, mult, floatCapInfo }) {
  const capKpi =
    floatCapInfo?.mode === "off"
      ? {
          value: "Off",
          sub: "Hoarding not limited by tradable liquid.",
          tooltip:
            "When off, monthly hoarding is not scaled down when it would exceed the room left in the liquid float. Turn the cap on to see whether gross buying ever hits that ceiling in this scenario.",
          highlight: false,
        }
      : floatCapInfo?.boundMonths > 0
        ? {
            value: `${floatCapInfo.boundMonths} / ${floatCapInfo.totalMonths} mo`,
            sub: `Peak ${floatCapInfo.maxRationPct.toFixed(0)}% of gross buy demand rationed.`,
            tooltip:
              "Months where the model scales down buys because modeled hoarding would exceed available liquid BTC. Peak ration is the largest fraction of gross buy demand that had to be deferred in a single month.",
            highlight: true,
          }
        : {
            value: "Not binding",
            sub: "No rationing this run.",
            tooltip:
              "Gross hoarding never exceeded liquid-room in any month, so capped vs uncapped paths match. Stress flows or shrink the float to see the cap bind.",
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
          sub={`${mult.toFixed(1)}× from ${fmtUSD(p.startPrice)}.`}
          tooltip="Terminal nominal BTC/USD at the end of the simulation horizon, given your demand, supply, and market-dynamics parameters."
          highlight
        />
        <KPI
          label={`Price in today's dollars (${p.inflation}% inflation adj.)`}
          value={fmtUSD(last.priceReal)}
          sub={`Rough purchasing power parity (PPP) vs start at ${p.inflation}%/yr inflation.`}
          tooltip="A simple deflation of the nominal path by the inflation slider — a coarse stand-in for inflation-adjusted purchasing power, not formal purchasing power parity between economies or a full macro model."
        />
        <KPI
          label="Liquid BTC Remaining"
          value={`${last.liquidM.toFixed(2)}M`}
          sub={`${last.liquidPct.toFixed(0)}% of the initial liquid pool.`}
          tooltip="Modeled tradeable float after treasuries, ETFs, LTH/ancient buckets, and flows — not the same as on-chain ‘liquid supply’ metrics from analytics firms."
          warn={last.liquidPct < 15}
        />
        <KPI
          label="Supply Shock Year"
          value={supplyShockYear ? `~${Math.floor(supplyShockYear)}` : "None"}
          sub={
            supplyShockYear
              ? "First calendar year when liquid BTC falls below 30% of its starting level."
              : "Threshold not crossed — liquid stayed above 30% of the initial pool through the horizon."
          }
          tooltip="A visualization aid for a ‘tight float’ regime, not a prediction of a market crash. Exact timing depends on all flows and on price feedback through the demand model."
          warn={!!supplyShockYear}
        />
        {floatCapInfo && (
          <KPI
            label="Cap buying to float"
            value={capKpi.value}
            sub={capKpi.sub}
            tooltip={capKpi.tooltip}
            highlight={capKpi.highlight}
          />
        )}
        <KPI
          label={`MSTR BTC/day · ${Math.floor(YEAR_START + p.simYears)}`}
          value={last.strcDayBtc.toLocaleString()}
          sub={`Network issuance (mining) is ${last.dailyMining.toFixed(0)} BTC/day.`}
          tooltip="Company BTC accumulation per day implied by your strategy parameters at the terminal date, shown next to modeled new supply from mining."
        />
        <KPI
          label="Corp Treasury Total"
          value={`${last.treasuryM.toFixed(2)}M BTC`}
          sub={`${((last.treasuryM / (p.circulatingSupply / 1e6)) * 100).toFixed(0)}% of modeled circulating supply.`}
          tooltip="Sum of modeled corporate treasury holdings (e.g. MSTR-style path plus any other treasury sliders you enabled)."
        />
      </div>
    </div>
  );
}
