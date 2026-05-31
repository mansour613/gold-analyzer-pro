# V11.15 Strategy Calibration + Historical Prefetch Update

## Implemented

- Expanded candle history requests for every timeframe:
  - 1M / 5M / 15M / 30M / 1H: 2 months
  - 4H: 6 months
  - 1D: 1 year
  - W: 5 years
- Added all-timeframe background prefetch and timeframe candle cache in the frontend MarketContext.
- Added higher-timeframe bias filtering for signal generation.
- Added timeframe alignment score logic.
- Added ATR-based stop loss and take profit calibration.
- Added minimum risk/reward filter. Signals fall back to WAIT when RR is weak.
- Added support/resistance proximity checks before BUY/SELL signals.
- Added WAIT penalties for:
  - price mid-range
  - weak timeframe alignment
  - high-impact news flag support
  - poor RR
  - conflict against higher timeframe bias
- Added market state classification: TRENDING / RANGING / BREAKOUT.
- Added price action summary field for signals and Analysis page display.
- Added signal expiry duration by timeframe.
- Added backtest-lite check based on similar RSI conditions from recent candle history.
- Increased Twelve Data output size handling with `TWELVE_DATA_OUTPUTSIZE` / `MAX_CANDLES_PER_REQUEST` env support.

## Build Verification

- Frontend build: passed
- API build: passed

## Notes

Real analysis quality depends on Twelve Data plan limits. If the free plan returns fewer candles than requested, the app still uses whatever valid candles are returned and will mark insufficient data if history is too short.
