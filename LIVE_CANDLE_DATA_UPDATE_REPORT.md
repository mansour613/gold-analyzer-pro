# Live Candle Data Update Report

## Goal
Make Signals, Levels, and Analysis calculate from live candle data instead of placeholder/static values.

## Implemented

### API
- Added reusable Yahoo chart fetcher for live OHLC candles.
- Added live DXY quote endpoint: `/api/gold/dxy`.
- Gold quote and candle endpoints still use live Yahoo XAU/USD/Gold futures fallback.

### Market Context
- Fetches live XAUUSD quote.
- Fetches live XAUUSD candles for the selected timeframe.
- Fetches live DXY quote when available.
- Signal engine now recalculates whenever timeframe candles update.
- Scan All now fetches live candles for each scanned timeframe where possible, with local resampling fallback only if the live request fails.

### Signals
- Signal cards are driven by live candle-derived signal output.
- Entry, stop loss, take profits, confluence, RSI, EMA, MACD and reasons come from the signal engine using candles.
- Scan button is asynchronous and uses live timeframe candles.

### Levels
- Pivot levels now use previous-day OHLC from live candles when available.
- Smart S/R uses live swing highs/lows.
- Fibonacci levels use live high/low range.
- Session levels use actual current-day candle highs/lows by session when available.
- No fake session approximations.

### Analysis
- Main bias, momentum, current wave, target zone, market structure, and S/R use live candle-derived values.
- Multi-timeframe bias dashboard uses live signal scans where available.
- Gold vs DXY uses live DXY quote/change if endpoint succeeds.
- Removed fixed fake target fallback.

## Build Verification
- Frontend build passed.
- API build passed.

## Notes
Live calculations depend on Yahoo Finance availability. If Yahoo blocks/returns no data, the UI will show waiting/fallback states rather than fake prices.
