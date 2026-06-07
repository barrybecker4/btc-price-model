# Phase 2 — Forecast backtesting

Walk-forward validation for the short-term forecast module (`src/forecast/`).

## Planned workflow

1. **`walkForward.js`** — For each historical day D, build features from data ≤ D, forecast 24h/168h distributions, compare to realized prices.
2. **`metrics.js`** — CRPS, log score, median MAE, calibration bins (P(up) deciles vs realized frequency).
3. **`scripts/backtest-forecast.mjs`** — Node CLI that loads BTC/SPY history, runs walk-forward, writes `backtestReport.json`.
4. **Coefficient tuning** — Grid search or regression on walk-forward errors; update `model/coefficients.json`.

## Run (when implemented)

```bash
npm run backtest:forecast
```

## Baselines to beat

- Historical-vol random walk (log-normal with trailing 30d σ only)
- Pure log-normal without mixture

## UI (optional)

Commit `backtestReport.json` and surface read-only quality metrics in the forecast tab footer.
