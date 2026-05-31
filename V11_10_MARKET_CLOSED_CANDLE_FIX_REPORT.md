# V11.10 Market Closed Candle Data Fix

Applied fixes:

- Removed the overly strict XAUUSD > 4200 hard rejection that caused valid latest-completed candle data to be discarded.
- Kept a broad sanity guard only (1000-10000) so clearly broken data is still rejected.
- Backend candle endpoint now returns `usableLastCompletedCandle` when last historical candle exists.
- This allows Home, Chart signal bar, Signals, Levels, and Analysis to read the latest completed candles even when the market is closed.

Expected behavior:

- Market closed should not mean no data.
- App should show last completed XAUUSD candle data instead of `--`, `$0.00`, or `No Setup` caused by missing candles.
- Signals/levels/analysis can calculate from the latest completed timeframe candles.
