# Gold Analyzer Pro V11.8 Rebuild Report

Built from: `gold-analyzer-pro-v11-7-signal-history-performance.zip`

## Included V11 focus rebuild

- Restored clean live TradingView chart behavior using `FUSIONMARKETS:XAUUSD` on the chart page.
- Kept TradingView drawing tools/toolbars hidden.
- Removed the broken chart levels overlay approach from the active chart UI.
- Preserved compact mobile UI improvements for bottom navigation, chart signal bar, timeframe selectors, and headers.
- Preserved signal history/performance functionality.
- Preserved Arabic language improvements.

## Data reliability rebuild

- Removed Yahoo `GC=F` futures fallback from the XAUUSD engine.
- Gold calculations now avoid mixing COMEX futures with spot XAUUSD.
- Added a spot-price validation guard to reject suspicious values that can corrupt signals, levels, or analysis.
- Added optional spot validation against a second spot reference feed when available.
- Added feed metadata support: feed status, confidence, verified sources, and data age.
- Retained stale-data protection and refresh-driven recalculation behavior.

## Build checks

- Frontend build: passed
- API build: passed

## Important note

If deployed price still shows unrealistic values, verify the backend live feed response at:

- `/api/gold/quote`
- `/api/gold/candles?interval=15m&range=5d`

The API now rejects obvious non-spot values instead of letting bad prices drive Levels, Signals, and Analysis.
