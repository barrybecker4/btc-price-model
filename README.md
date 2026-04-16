# Bitcoin Supply Shock Model

Single-page React app that runs a **monthly simulation** of Bitcoin price, liquid supply, corporate/ETF accumulation, and mining—then charts the results. All logic and UI live in [`src/App.jsx`](src/App.jsx).

## Stack

- [React](https://react.dev/) 19 · [Vite](https://vite.dev/) 8
- Charts: [Recharts](https://recharts.org/) (`LineChart`, `AreaChart`, reference lines for halvings and “supply shock”)

## Run locally

```bash
npm install
npm run dev
```

Build: `npm run build` · Preview production build: `npm run preview`

## What `App.jsx` does

### Simulation (`runSim`)

- **Horizon**: From `YEAR_START` (**2026**) through `simYears` (default 15), one row per month.
- **State each month**: BTC price, liquid BTC, coins in corporate treasuries and ETFs, cumulative “lost” coins, and various USD/BTC flow rates.
- **Mining**: `getDailyMining(year)` applies block-reward halving at 2028, 2032, 2036, 2040 (reward steps down from 3.125 BTC/block).
- **Supply shock flag**: `supplyShockYear` is set the first time **liquid BTC** falls below **30%** of the initial liquid pool (used for the red “SHOCK” marker on charts).
- **Price update**: Uses net monthly demand vs. **liquid** supply, with elasticity that rises as the liquid pool shrinks (`baseElasticity / liquidRatio`), monthly change capped by `maxMonthlyPctGain`, floor at `miningCostFloor`.
- **Macro**: `gdpGrowth` scales USD-denominated flows each month (commented in code as a stand-in for nominal growth / expanding capital base). Inflation feeds **real** price (`priceReal`) via `inflation`.
- **Outputs**: Each point includes nominal/real price, liquid/treasury/ETF/lost supply (millions), daily buy/sell breakdowns, etc.

The sidebar sliders map to a single `p` object (`DEFAULTS`); changing any value recomputes via `useMemo(() => runSim(p), [p])`.

### UI

- **Left column**: Collapsible sections (macro, supply/mining, MSTR-style treasury, other treasuries & ETFs, organic flow, market dynamics) plus live stats and **Reset to defaults**.
- **Main panel**: KPI strip (terminal price, real price, liquid %, shock year, MSTR BTC/day, treasury % of mined) and three chart tabs:
  - **Price**: Nominal vs inflation-adjusted, halving lines, supply-shock line (log scale optional).
  - **Supply breakdown**: Stacked areas (lost, corporate treasury, ETF, liquid).
  - **Daily flow**: Buying vs selling vs mining vs MSTR vs ETF (downsampled series uses `cd` = every 3rd month for smoother charts).

Styling is inline (dark theme, monospace labels); no separate component files.

## Important caveats

- This is an **exploratory toy model** for scenario play, not a forecast. Parameters are highly stylized; results are sensitive to sliders and assumptions in `runSim`.
- The UI compares some figures to **~450 BTC/day** mining as a rough reference; the simulation itself uses **`getDailyMining`** (halving-aware), so that sidebar line is a **simplified comparison**, not the exact simulated monthly average.
- **Not financial advice** (also stated in the app footer).

## Project layout

| Path | Role |
|------|------|
| `src/App.jsx` | Entire app: simulation, layout, charts |
| `src/main.jsx` | Vite/React entry (unchanged from template) |
| `src/App.css` | Global styles if any (template) |
