# V11.18.2 Daily Range + Pivot Source Fix

Base ZIP: `gold-analyzer-pro-v11-18-backend-signals-daily-range-fix(1).zip`

## Fixes applied

1. **Day High / Day Low source fixed**
   - Quote endpoint now uses the latest meaningful completed daily candle.
   - Tiny partial/weekend daily candles are ignored when selecting daily high/low.

2. **Pivot Levels source fixed**
   - Intraday timeframes (`1M`, `5M`, `15M`, `30M`, `1H`, `4H`) now use completed daily OHLC for pivots.
   - `1D`/`W` continue to use higher timeframe references.
   - Pivot levels no longer use tiny 15M candle ranges.

3. **Weekend / market-closed behavior improved**
   - When the market is closed, the backend skips partial/tiny weekend candles and uses the last real trading day for daily pivots and Day High/Low.

4. **Build checks passed**
   - API TypeScript build passed.
   - Frontend TypeScript + Vite build passed.
