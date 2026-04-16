import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, ReferenceLine,
} from "recharts";

const YEAR_START = 2026;
const FONT_MONO = "'Courier New', 'Lucida Console', monospace";
const FONT_HEAD = "'Georgia', 'Times New Roman', serif";

function getDailyMining(year) {
  let reward = 3.125;
  if (year >= 2028) reward /= 2;
  if (year >= 2032) reward /= 2;
  if (year >= 2036) reward /= 2;
  if (year >= 2040) reward /= 2;
  return 144 * reward;
}

function fmtUSD(v) {
  if (!isFinite(v) || v >= 1e12) return ">$1T";
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3)  return `$${(v / 1e3).toFixed(0)}K`;
  return `$${Math.round(v).toLocaleString()}`;
}

/* ─────────────── DEFAULTS ─────────────── */
const DEFAULTS = {
  simYears: 15,
  startPrice: 85000,
  bondYield: 4.5,
  inflation: 3.0,
  gdpGrowth: 3.5,
  circulatingSupply: 19850000,
  alreadyLostCoins: 3700000,
  annualLossRate: 0.20,
  minerSellPct: 85,
  miningCostFloor: 35000,
  strcInitialBtc: 500000,
  strcInitialUsdB: 83,
  strcGrowthRate: 20,
  otherInitialBtc: 200000,
  otherTreasuryUsdB: 20,
  otherTreasuryGrowth: 40,
  etfInitialBtc: 1000000,
  etfDailyInflowM: 100,
  etfGrowthRate: 15,
  organicDailyBuy: 200,
  organicDailySell: 500,
  organicBuyGrowth: 8,
  organicSellDecline: 5,
  baseElasticity: 1.5,
  maxMonthlyPctGain: 20,
};

/* ─────────────── SIMULATION ─────────────── */
function runSim(p) {
  const months  = p.simYears * 12;
  const safeLost = Math.min(p.alreadyLostCoins, p.circulatingSupply * 0.9);

  let price    = p.startPrice;
  let lostBtc  = safeLost;
  let treasury = p.strcInitialBtc + p.otherInitialBtc;
  let etfBtc   = p.etfInitialBtc;
  let liquid   = Math.max(p.circulatingSupply - lostBtc - treasury - etfBtc, 200000);
  const initLiq = liquid;

  let strcUSD  = (p.strcInitialUsdB  * 1e9) / 12;
  let otherUSD = (p.otherTreasuryUsdB * 1e9) / 12;
  let etfUSD   = p.etfDailyInflowM * 1e6 * 30;
  let buyBtcM  = p.organicDailyBuy  * 30;
  let sellBtcM = p.organicDailySell * 30;

  // GDP nominal growth drives money-supply expansion.
  // Applied as an additional monthly multiplier to ALL USD-denominated flows,
  // representing the expanding pool of global capital available to buy BTC.
  // Without this, USD flows stay flat in real terms and get outrun by price,
  // causing a false equilibrium plateau. With it, the money supply grows with
  // the economy, sustaining demand pressure across the simulation horizon.
  const gdpMonthlyBoost = p.gdpGrowth / 100 / 12;

  const data = [];
  let supplyShockYear = null;

  for (let m = 0; m <= months; m++) {
    const year        = YEAR_START + m / 12;
    const dailyMining = getDailyMining(year);
    const liquidPct   = (liquid / initLiq) * 100;
    if (liquidPct < 30 && !supplyShockYear) supplyShockYear = year;

    const strcDayBtc   = strcUSD  / price / 30;
    const otherDayBtc  = otherUSD / price / 30;
    const etfDayBtc    = etfUSD   / price / 30;
    const minerSellDay = dailyMining * p.minerSellPct / 100;
    const totalBuyDay  = strcDayBtc + otherDayBtc + etfDayBtc + buyBtcM / 30;
    const totalSellDay = minerSellDay + sellBtcM / 30;

    data.push({
      year:         parseFloat(year.toFixed(3)),
      price:        Math.round(price),
      priceReal:    Math.round(price / Math.pow(1 + p.inflation / 100, m / 12)),
      liquidM:      parseFloat((liquid   / 1e6).toFixed(3)),
      treasuryM:    parseFloat((treasury / 1e6).toFixed(3)),
      etfM:         parseFloat((etfBtc   / 1e6).toFixed(3)),
      lostM:        parseFloat((lostBtc  / 1e6).toFixed(3)),
      liquidPct:    parseFloat(liquidPct.toFixed(1)),
      strcDayBtc:   parseFloat(strcDayBtc.toFixed(0)),
      etfDayBtc:    parseFloat(etfDayBtc.toFixed(0)),
      otherDayBtc:  parseFloat(otherDayBtc.toFixed(0)),
      dailyMining:  parseFloat(dailyMining.toFixed(1)),
      totalBuyDay:  parseFloat(totalBuyDay.toFixed(0)),
      totalSellDay: parseFloat(totalSellDay.toFixed(0)),
      netDayDemand: parseFloat((totalBuyDay - totalSellDay).toFixed(0)),
    });

    if (m === months) break;

    const monthlyMining = dailyMining * 30;
    const minerSales    = monthlyMining * (p.minerSellPct / 100);
    const coinsLost     = liquid * (p.annualLossRate / 100 / 12);
    const strcBtc       = strcUSD  / price;
    const otherBtc      = otherUSD / price;
    const etfBtc2       = etfUSD   / price;
    const netDemand     = strcBtc + otherBtc + etfBtc2 + buyBtcM - minerSales - sellBtcM;

    // Price discovery: as liquid supply shrinks, the same net flow has more impact.
    // The liquidRatio denominator creates exponential amplification near zero.
    const liquidRatio = Math.max(liquid / initLiq, 0.03);
    const elasticity  = p.baseElasticity / liquidRatio;
    const rawPct      = (netDemand / Math.max(liquid, 50000)) * elasticity;
    const cap         = p.maxMonthlyPctGain / 100;
    const pctChange   = Math.max(-0.20, Math.min(rawPct, cap));

    price = Math.max(price * (1 + pctChange), p.miningCostFloor);
    // No hard ceiling. Guard NaN/Inf only.
    if (!isFinite(price)) price = data[data.length - 1]?.price ?? p.startPrice;

    liquid   = Math.max(liquid - netDemand - coinsLost, 50000);
    treasury += strcBtc + otherBtc;
    etfBtc   += etfBtc2;
    lostBtc  += coinsLost;

    // Grow USD flows: own growth rate PLUS GDP-driven money-supply expansion.
    // This ensures rising price doesn't outrun all demand and cause a false plateau.
    const gm = (r) => 1 + r / 100 / 12;
    strcUSD  *= gm(p.strcGrowthRate)      * (1 + gdpMonthlyBoost);
    otherUSD *= gm(p.otherTreasuryGrowth) * (1 + gdpMonthlyBoost);
    etfUSD   *= gm(p.etfGrowthRate)       * (1 + gdpMonthlyBoost);
    buyBtcM  *= gm(p.organicBuyGrowth)    * (1 + gdpMonthlyBoost);
    sellBtcM *= (1 - p.organicSellDecline / 100 / 12);
  }

  return { data, supplyShockYear };
}

/* ─────────────── COLORS ─────────────── */
const C = {
  bg: "#0a0a0a", panel: "#111111", border: "#252525",
  amber: "#ffaa00", amberDim: "#aa7700",
  green: "#00ee7a", red: "#ff4466", blue: "#44aaff", gray: "#555",
  text: "#e4e4e4", dim: "#aaaaaa", label: "#cccccc", hint: "#888888",
  treasury: "#ef4444", etf: "#3388ee", lost: "#252525", liquid: "#00cc66",
};

/* ─────────────── UI ATOMS ─────────────── */
function Slider({ label, hint, value, min, max, step, onChange, fmt }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ fontSize: 11, color: C.label, fontFamily: FONT_MONO }}>{label}</span>
        <span style={{ fontSize: 12, color: C.amber, fontFamily: FONT_MONO, fontWeight: 700 }}>
          {fmt ? fmt(value) : value}
        </span>
      </div>
      {hint && (
        <div style={{ fontSize: 9, color: C.hint, marginBottom: 4, fontFamily: FONT_MONO, lineHeight: 1.55 }}>
          {hint}
        </div>
      )}
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: C.amber, cursor: "pointer", height: 3 }}
      />
    </div>
  );
}

function Section({ title, children, open: def = true }) {
  const [open, setOpen] = useState(def);
  return (
    <div style={{ marginBottom: 5 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", padding: "7px 9px",
        background: open ? "#1a1a1a" : "#141414",
        border: `1px solid ${open ? C.amberDim : C.border}`,
        borderRadius: 3, cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        color: C.amber, fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700,
        letterSpacing: "0.07em", textTransform: "uppercase",
      }}>
        {title}
        <span style={{ color: C.hint, fontSize: 9 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "10px 6px 4px 8px", borderLeft: "1px solid #1c1c1c", marginLeft: 2 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, sub, warn, highlight }) {
  const color = warn ? C.red : highlight ? C.amber : C.text;
  return (
    <div style={{
      flex: "1 1 120px", background: "#0f0f0f",
      border: `1px solid ${warn ? "#441111" : highlight ? "#3a2800" : C.border}`,
      borderRadius: 4, padding: "10px 12px",
    }}>
      <div style={{ fontSize: 9, color: C.hint, fontFamily: FONT_MONO, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color, fontFamily: FONT_MONO }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: C.dim, fontFamily: FONT_MONO, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

const TIP = {
  contentStyle: { background: "#161616", border: "1px solid #2a2a2a", fontSize: 11, fontFamily: FONT_MONO, padding: "8px 12px" },
  labelStyle:   { color: C.amber, marginBottom: 4 },
  itemStyle:    { color: C.text },
};
const XAXIS_PROPS = {
  dataKey: "year", type: "number", scale: "linear",
  domain: ["dataMin", "dataMax"],
  tickFormatter: (v) => Math.floor(v),
  stroke: "#1e1e1e",
  tick: { fontSize: 10, fill: C.dim, fontFamily: FONT_MONO },
  tickLine: false,
};

/* ─────────────── APP ─────────────── */
export default function App() {
  const [p, setP]          = useState(DEFAULTS);
  const [tab, setTab]      = useState("price");
  const [logScale, setLog] = useState(true);

  const set = (k) => (v) => setP((prev) => ({ ...prev, [k]: v }));

  const { data, supplyShockYear } = useMemo(() => runSim(p), [p]);
  const cd    = useMemo(() => data.filter((_, i) => i % 3 === 0), [data]);
  const first = data[0];
  const last  = data[data.length - 1];
  const mult  = last.price / first.price;

  const halvings = [2028, 2032, 2036, 2040].filter(
    (y) => y > YEAR_START && y <= YEAR_START + p.simYears
  );
  const safeLostCoins  = Math.min(p.alreadyLostCoins, p.circulatingSupply * 0.9);
  const effectiveSupply = p.circulatingSupply - safeLostCoins;
  const strcYield       = (p.bondYield + 7).toFixed(1);
  const strcInitialDayBtc = Math.round(p.strcInitialUsdB * 1e9 / 365 / p.startPrice);

  const yAxisPrice = {
    scale: logScale ? "log" : "linear",
    domain: logScale ? [first.price * 0.5, "auto"] : [0, "auto"],
    tickFormatter: fmtUSD,
    stroke: "#1e1e1e",
    tick: { fontSize: 10, fill: C.dim, fontFamily: FONT_MONO },
    tickLine: false, width: 82, allowDecimals: false,
  };

  function HalvingLines({ yAxisId }) {
    return halvings.map((y) => (
      <ReferenceLine key={y} x={y} yAxisId={yAxisId} stroke="#222" strokeWidth={1.5} strokeDasharray="4 4"
        label={{ value: `⛏ ${y}`, position: "insideTopLeft", fill: "#333", fontSize: 8, fontFamily: FONT_MONO }}
      />
    ));
  }
  function ShockLine({ yAxisId }) {
    if (!supplyShockYear) return null;
    return (
      <ReferenceLine x={parseFloat(supplyShockYear.toFixed(1))} yAxisId={yAxisId}
        stroke={C.red} strokeWidth={1.5} strokeDasharray="6 3"
        label={{ value: "⚠ SHOCK", position: "insideTopRight", fill: C.red, fontSize: 9, fontFamily: FONT_MONO }}
      />
    );
  }

  const tabBtn = (key, lbl) => (
    <button onClick={() => setTab(key)} style={{
      padding: "5px 14px",
      background: tab === key ? C.amber : "transparent",
      border: `1px solid ${tab === key ? C.amber : C.border}`,
      borderRadius: 2, cursor: "pointer",
      color: tab === key ? "#000" : C.dim,
      fontSize: 10, fontFamily: FONT_MONO,
      fontWeight: tab === key ? 700 : 400,
      letterSpacing: "0.06em",
    }}>{lbl}</button>
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.text, fontFamily: FONT_MONO, overflow: "hidden" }}>

      {/* ── SIDEBAR ── */}
      <div style={{
        width: 278, minWidth: 278, background: C.panel,
        borderRight: `1px solid ${C.border}`,
        overflowY: "auto", padding: "12px 10px",
        scrollbarWidth: "thin", scrollbarColor: "#222 transparent",
      }}>
        <div style={{ textAlign: "center", marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.amber, fontFamily: FONT_HEAD }}>
            ₿ Supply Shock Model
          </div>
          <div style={{ fontSize: 9, color: C.hint, marginTop: 3, letterSpacing: "0.12em" }}>
            ADJUST PARAMETERS BELOW
          </div>
        </div>

        <Section title="◈ Macroeconomic">
          <Slider label="Simulation Period"  value={p.simYears}   min={5}  max={25} step={1}   onChange={set("simYears")}  fmt={(v) => `${v} yrs`} />
          <Slider label="Starting BTC Price" value={p.startPrice} min={50000} max={250000} step={5000} onChange={set("startPrice")} fmt={fmtUSD} />
          <Slider label="10yr Bond Yield"    value={p.bondYield}  min={2}  max={10} step={0.1} onChange={set("bondYield")} fmt={(v) => `${v.toFixed(1)}%`} />
          <Slider label="USD Inflation Rate" value={p.inflation}  min={1}  max={15} step={0.1} onChange={set("inflation")} fmt={(v) => `${v.toFixed(1)}%/yr`} />
          <Slider
            label="Nominal GDP Growth"
            hint="Global nominal GDP growth (real GDP + inflation). Applied as an extra monthly multiplier to ALL USD-denominated demand flows — simulating money-supply expansion. Higher GDP → more capital chasing BTC → the price curve continues rising rather than plateauing."
            value={p.gdpGrowth} min={1} max={12} step={0.1}
            onChange={set("gdpGrowth")}
            fmt={(v) => `${v.toFixed(1)}%/yr`}
          />
        </Section>

        <Section title="⛏ Supply &amp; Mining">
          <Slider
            label="Total BTC Ever Mined"
            hint="All mined BTC including lost coins (~19.85M today). Hard cap = 21M. This is NOT the effective liquid supply — lost coins must be subtracted below."
            value={p.circulatingSupply} min={19000000} max={21000000} step={50000}
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
            min={500000} max={Math.floor(p.circulatingSupply * 0.9)} step={100000}
            onChange={set("alreadyLostCoins")}
            fmt={(v) => `${(v / 1e6).toFixed(2)}M`}
          />
          <div style={{ fontSize: 10, color: C.green, fontFamily: FONT_MONO, marginBottom: 10, marginTop: -4, padding: "3px 0" }}>
            Effective supply: {(effectiveSupply / 1e6).toFixed(2)}M BTC
          </div>
          <Slider label="Annual Coin Loss Rate" hint="% of liquid BTC lost per year going forward." value={p.annualLossRate} min={0.05} max={0.5} step={0.05} onChange={set("annualLossRate")} fmt={(v) => `${v.toFixed(2)}%/yr`} />
          <Slider label="Miner Sell Pressure"   hint="% of newly mined BTC immediately sold by miners to cover costs." value={p.minerSellPct} min={50} max={100} step={1} onChange={set("minerSellPct")} fmt={(v) => `${v}%`} />
          <Slider label="Mining Cost Floor"     hint="All-in production cost floor. Price cannot fall below this level." value={p.miningCostFloor} min={20000} max={150000} step={1000} onChange={set("miningCostFloor")} fmt={fmtUSD} />
        </Section>

        <Section title="🏦 Strategy / MSTR">
          <Slider label="Initial BTC Holdings"              value={p.strcInitialBtc}  min={100000} max={1000000} step={10000} onChange={set("strcInitialBtc")}  fmt={(v) => `${(v / 1000).toFixed(0)}K BTC`} />
          <Slider
            label="Initial Annual USD Purchase Rate"
            hint="Strategy's BTC acquisition spend at t=0 (annualized). This is the starting rate — grows each year at the rate below."
            value={p.strcInitialUsdB} min={5} max={300} step={5}
            onChange={set("strcInitialUsdB")}
            fmt={(v) => `$${v}B/yr`}
          />
          <Slider
            label="Annual Capital Raise Growth"
            hint={`Rate at which Strategy grows its USD capital raises annually. Minimum realistic floor = inflation rate (${p.inflation.toFixed(1)}%). Strategy has historically grown well above this via convertible notes and ATM offerings.`}
            value={p.strcGrowthRate} min={Math.ceil(p.inflation)} max={80} step={1}
            onChange={set("strcGrowthRate")}
            fmt={(v) => `${v}%/yr`}
          />
        </Section>

        <Section title="🏢 Other Treasuries &amp; ETFs" open={false}>
          <Slider label="Other Corp. Initial Holdings" value={p.otherInitialBtc}     min={0}   max={500000} step={10000} onChange={set("otherInitialBtc")}     fmt={(v) => `${(v / 1000).toFixed(0)}K BTC`} />
          <Slider label="Other Corp. Annual USD"       hint="MARA, Riot, Metaplanet, Semler Scientific, etc." value={p.otherTreasuryUsdB} min={0} max={150} step={2} onChange={set("otherTreasuryUsdB")} fmt={(v) => `$${v}B/yr`} />
          <Slider label="Other Corp. Growth"           hint="Catching up as playbook spreads globally." value={p.otherTreasuryGrowth} min={0} max={100} step={5} onChange={set("otherTreasuryGrowth")} fmt={(v) => `${v}%/yr`} />
          <Slider label="ETF Initial Holdings"         value={p.etfInitialBtc}        min={500000} max={3000000} step={50000} onChange={set("etfInitialBtc")}  fmt={(v) => `${(v / 1e6).toFixed(2)}M BTC`} />
          <Slider label="ETF Net Daily Inflow"         hint="Net USD inflow per day across all spot BTC ETFs." value={p.etfDailyInflowM} min={0} max={2000} step={10} onChange={set("etfDailyInflowM")} fmt={(v) => `$${v}M/day`} />
          <Slider label="ETF Inflow Growth"            value={p.etfGrowthRate} min={0} max={50} step={2} onChange={set("etfGrowthRate")} fmt={(v) => `${v}%/yr`} />
        </Section>

        <Section title="👥 Organic Market" open={false}>
          <Slider label="Retail Daily Buying"  value={p.organicDailyBuy}     min={0} max={2000} step={50} onChange={set("organicDailyBuy")}     fmt={(v) => `${v} BTC/day`} />
          <Slider label="Retail Daily Selling" value={p.organicDailySell}    min={0} max={3000} step={50} onChange={set("organicDailySell")}    fmt={(v) => `${v} BTC/day`} />
          <Slider label="Retail Buy Growth"    value={p.organicBuyGrowth}    min={0} max={30}   step={1}  onChange={set("organicBuyGrowth")}    fmt={(v) => `${v}%/yr`} />
          <Slider label="HODLer Sell Decline"  hint="Annual % reduction in retail selling as scarcity narrative hardens and price rises." value={p.organicSellDecline} min={0} max={20} step={1} onChange={set("organicSellDecline")} fmt={(v) => `${v}%/yr`} />
        </Section>

        <Section title="⚡ Market Dynamics" open={false}>
          <Slider
            label="Base Price Elasticity"
            hint="Sensitivity of price to net buy/sell imbalance, relative to liquid supply. At 1.0×, a 1% net demand imbalance moves price 1% — before the scarcity amplifier. As liquid supply shrinks (thin order book), this multiplier amplifies: 1% imbalance on 5% remaining supply creates a ~20× larger move. Higher base = more violent shock. Lower = smoother repricing."
            value={p.baseElasticity} min={0.2} max={5} step={0.1}
            onChange={set("baseElasticity")}
            fmt={(v) => `${v.toFixed(1)}×`}
          />
          <Slider
            label="Max Monthly Price Gain"
            hint="Hard cap on upward monthly price change. 20% = potentially 792%/yr compounded at the peak. Lower values smooth the shock curve and extend the run over more years."
            value={p.maxMonthlyPctGain} min={5} max={50} step={1}
            onChange={set("maxMonthlyPctGain")}
            fmt={(v) => `${v}%/mo`}
          />
        </Section>

        {/* Live stats */}
        <div style={{
          marginTop: 10, padding: "9px 10px",
          background: "#0d0d0d", border: `1px solid ${C.border}`,
          borderRadius: 3, fontFamily: FONT_MONO,
        }}>
          {[
            ["STRC Yield (bond + 7%)", `${strcYield}%`, C.amber],
            ["Initial MSTR BTC/day",   strcInitialDayBtc.toLocaleString(), C.text],
            ["vs mining output",       "450 BTC/day", C.green],
            ["Demand ratio",           `${(strcInitialDayBtc / 450).toFixed(1)}×`, C.red],
            ["Effective supply",       `${(effectiveSupply / 1e6).toFixed(2)}M BTC`, C.text],
          ].map(([lbl, val, col]) => (
            <div key={lbl} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, lineHeight: 2.1 }}>
              <span style={{ color: C.hint }}>{lbl}:</span>
              <span style={{ color: col, fontWeight: col !== C.text ? 700 : 400 }}>{val}</span>
            </div>
          ))}
        </div>

        <button onClick={() => setP(DEFAULTS)} style={{
          width: "100%", marginTop: 10, padding: "7px 0",
          background: "transparent", border: `1px solid ${C.border}`,
          borderRadius: 3, color: C.dim, cursor: "pointer",
          fontSize: 9, fontFamily: FONT_MONO, letterSpacing: "0.1em",
        }}>
          ↺ RESET TO DEFAULTS
        </button>
      </div>

      {/* ── MAIN PANEL ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* KPI bar */}
        <div style={{ padding: "12px 20px 10px", borderBottom: `1px solid ${C.border}`, background: "#0d0d0d", flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: C.amberDim, fontFamily: FONT_HEAD, fontStyle: "italic", marginBottom: 8 }}>
            Bitcoin Supply Shock Simulator &nbsp;·&nbsp; {YEAR_START}–{YEAR_START + p.simYears}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <KPI label={`BTC Price · ${YEAR_START + p.simYears}`}     value={fmtUSD(last.price)}          sub={`${mult.toFixed(1)}× from ${fmtUSD(p.startPrice)}`} highlight />
            <KPI label="Real Price · Infl-Adj"                        value={fmtUSD(last.priceReal)}       sub={`at ${p.inflation}%/yr inflation`} />
            <KPI label="Liquid BTC Remaining"                         value={`${last.liquidM.toFixed(2)}M`} sub={`${last.liquidPct.toFixed(0)}% of initial pool`} warn={last.liquidPct < 15} />
            <KPI label="Supply Shock Year"                            value={supplyShockYear ? `~${Math.floor(supplyShockYear)}` : "None"} sub="Liquid BTC drops below 30% of start" warn={!!supplyShockYear} />
            <KPI label={`MSTR BTC/day · ${YEAR_START + p.simYears}`} value={last.strcDayBtc.toLocaleString()} sub={`mining: ${last.dailyMining.toFixed(0)} BTC/day`} />
            <KPI label="Corp Treasury Total"                          value={`${last.treasuryM.toFixed(2)}M BTC`} sub={`${((last.treasuryM / (p.circulatingSupply / 1e6)) * 100).toFixed(0)}% of all mined`} />
          </div>
        </div>

        {/* Charts */}
        <div style={{ flex: 1, padding: "14px 20px", overflow: "auto" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, alignItems: "center" }}>
            {tabBtn("price",  "PRICE CHART")}
            {tabBtn("supply", "SUPPLY BREAKDOWN")}
            {tabBtn("flow",   "DAILY FLOW")}
            {tab === "price" && (
              <label style={{ marginLeft: "auto", fontSize: 10, color: C.dim, display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                <input type="checkbox" checked={logScale} onChange={(e) => setLog(e.target.checked)} style={{ accentColor: C.amber }} />
                LOG SCALE
              </label>
            )}
          </div>

          {tab === "price" && (
            <>
              <div style={{ fontSize: 9, color: C.hint, marginBottom: 8, letterSpacing: "0.06em" }}>
                BTC PRICE (USD) — Nominal vs Inflation-Adjusted · Halvings &amp; Supply Shock Marked
              </div>
              <ResponsiveContainer width="100%" height={310}>
                <LineChart data={cd} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                  <CartesianGrid stroke="#141414" strokeDasharray="3 3" />
                  <XAxis {...XAXIS_PROPS} />
                  <YAxis yAxisId="p" {...yAxisPrice} />
                  <Tooltip {...TIP} formatter={(v, n) => [fmtUSD(v), n]} labelFormatter={(v) => `YEAR ${parseFloat(v).toFixed(1)}`} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: FONT_MONO, paddingTop: 8 }} />
                  <HalvingLines yAxisId="p" />
                  <ShockLine    yAxisId="p" />
                  <Line yAxisId="p" type="monotone" dataKey="price"     name="Nominal Price"                      stroke={C.amber} dot={false} strokeWidth={2.5} />
                  <Line yAxisId="p" type="monotone" dataKey="priceReal" name={`Real Price (${p.inflation}% adj.)`} stroke="#aa6600" dot={false} strokeWidth={1.5} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}

          {tab === "supply" && (
            <>
              <div style={{ fontSize: 9, color: C.hint, marginBottom: 8, letterSpacing: "0.06em" }}>
                BTC SUPPLY BREAKDOWN (MILLIONS) — Liquid pool shrinks as treasuries &amp; ETFs absorb supply
              </div>
              <ResponsiveContainer width="100%" height={310}>
                <AreaChart data={cd} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                  <CartesianGrid stroke="#141414" strokeDasharray="3 3" />
                  <XAxis {...XAXIS_PROPS} />
                  <YAxis stroke="#1e1e1e" tick={{ fontSize: 10, fill: C.dim, fontFamily: FONT_MONO }} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}M`} width={60} />
                  <Tooltip {...TIP} formatter={(v, n) => [`${parseFloat(v).toFixed(3)}M BTC`, n]} labelFormatter={(v) => `YEAR ${parseFloat(v).toFixed(1)}`} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: FONT_MONO, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="lostM"     name="Lost Forever"          stackId="1" fill={C.lost}     stroke={C.lost}     fillOpacity={1} />
                  <Area type="monotone" dataKey="treasuryM" name="Corp. Treasury (HODL)"  stackId="1" fill={C.treasury} stroke={C.treasury} fillOpacity={0.8} />
                  <Area type="monotone" dataKey="etfM"      name="ETF Holdings"           stackId="1" fill={C.etf}      stroke={C.etf}      fillOpacity={0.8} />
                  <Area type="monotone" dataKey="liquidM"   name="Liquid Market Supply"   stackId="1" fill={C.liquid}   stroke={C.liquid}   fillOpacity={0.7} />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}

          {tab === "flow" && (
            <>
              <div style={{ fontSize: 9, color: C.hint, marginBottom: 8, letterSpacing: "0.06em" }}>
                DAILY FLOW (BTC/DAY) — MSTR buys fewer BTC as price rises. Halvings cut mining supply.
              </div>
              <ResponsiveContainer width="100%" height={310}>
                <LineChart data={cd} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                  <CartesianGrid stroke="#141414" strokeDasharray="3 3" />
                  <XAxis {...XAXIS_PROPS} />
                  <YAxis stroke="#1e1e1e" tick={{ fontSize: 10, fill: C.dim, fontFamily: FONT_MONO }} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v} width={55} />
                  <Tooltip {...TIP} formatter={(v, n) => [`${Math.round(v).toLocaleString()} BTC/day`, n]} labelFormatter={(v) => `YEAR ${parseFloat(v).toFixed(1)}`} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: FONT_MONO, paddingTop: 8 }} />
                  {halvings.map((y) => (
                    <ReferenceLine key={y} x={y} stroke="#222" strokeDasharray="4 4"
                      label={{ value: "⛏", position: "insideTopLeft", fill: "#303030", fontSize: 10 }}
                    />
                  ))}
                  <Line type="monotone" dataKey="totalBuyDay"  name="Total Daily Buying"         stroke={C.green} dot={false} strokeWidth={2.5} />
                  <Line type="monotone" dataKey="totalSellDay" name="Total Daily Selling"         stroke={C.red}   dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="dailyMining"  name="Daily Mining Output"         stroke={C.gray}  dot={false} strokeWidth={1.5} strokeDasharray="5 4" />
                  <Line type="monotone" dataKey="strcDayBtc"   name="MSTR Daily Purchases (BTC)"  stroke={C.amber} dot={false} strokeWidth={1.5} strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="etfDayBtc"    name="ETF Daily Absorption (BTC)"  stroke={C.blue}  dot={false} strokeWidth={1.5} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}

          {/* Notes */}
          <div style={{
            marginTop: 16, padding: "11px 15px",
            background: "#0e0e0e", borderRadius: 4, border: `1px solid ${C.border}`,
            fontSize: 9, color: C.hint, fontFamily: FONT_MONO, lineHeight: 2,
          }}>
            <span style={{ color: "#777", fontWeight: 700 }}>PRICE MECHANISM: </span>
            Monthly Δprice = (net demand ÷ liquid BTC) × elasticity.
            Elasticity amplifies as liquid supply shrinks — a thin order book means each BTC of net demand moves price farther.
            GDP growth is applied as an extra monthly multiplier on all USD-denominated flows, representing money-supply expansion.
            <span style={{ color: "#555" }}> MSTR's BTC/day falls as price rises (USD fixed; BTC purchased = USD ÷ price) — the natural brake on accumulation rate. </span>
            <span style={{ color: "#664444" }}>NOT FINANCIAL ADVICE.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
