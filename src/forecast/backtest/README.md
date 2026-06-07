# Phase 2 — Forecast backtesting

Walk-forward validation for the short-term forecast module (`src/forecast/`).

## Run

```bash
npm run backtest:forecast
```

### CLI options

| Flag | Default | Description |
|------|---------|-------------|
| `--history` | 730 | Days of BTC/SPY history to load |
| `--holdout` | 365 | Trailing evaluation window |
| `--warmup` | 120 | Minimum BTC history before first forecast |
| `--step` | 7 | Days between forecast samples |
| `--max-samples` | unlimited | Cap samples for quick runs |

Example quick run:

```bash
npm run backtest:forecast -- --holdout 90 --step 14 --max-samples 20
```

## Output

- Console summary (CRPS, log score, median MAPE, Brier score)
- [`backtestReport.json`](backtestReport.json) — full metrics for UI or CI

## Metrics

| Metric | Lower is better? | Notes |
|--------|------------------|-------|
| CRPS | Yes | Continuous ranked probability score from PDF grid |
| Log score | Yes | Negative log density at realized price |
| Median MAPE | Yes | \|median − realized\| / realized |
| Brier score | Yes | Calibration of P(up) vs realized direction |

`modelVsBaseline` positive values mean the full model beat the historical-vol random walk baseline.

## Limitations

- Fear/Greed and CoinGecko global use neutral defaults (no free bulk history).
- Fed policy uses the current bundled snapshot, not point-in-time historical policy.
- SPY series is S&P 500 index CSV, aligned by calendar date with BTC.

## Baselines

The bundled baseline is a **historical-vol random walk**: μ=0, σ from trailing 30-day BTC realized vol (no mixture, no cross-asset features).

## Module layout

| File | Role |
|------|------|
| `walkForward.js` | Walk-forward loop + report |
| `metrics.js` | CRPS, log score, calibration |
| `buildHistoricalBundle.js` | Point-in-time feature bundle |
| `baselineRandomWalk.js` | Baseline forecast |
| `loadBacktestHistory.js` | Fetch BTC (CryptoCompare) + SPY CSV |
| `backtestReport.json` | Generated report (git may commit for UI) |
