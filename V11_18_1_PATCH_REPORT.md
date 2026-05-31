# Gold Analyzer Pro V11.18.1 Patch Report

Base: `gold-analyzer-pro-v11-18-backend-signals-daily-range-fix(1).zip`

## Fixes applied

1. Chart page duplicate Day High / Day Low cards removed.
   - Kept the main top market cards only.

2. Day High / Day Low behavior preserved through backend quote endpoint.
   - Uses daily candle context, not selected timeframe candles.
   - Market open: active/latest daily range from daily candle feed.
   - Market closed: latest completed daily candle range.

3. Hidden backend debug/source labels removed from visible UI.
   - Removed visible `twelvedata:XAU/USD`, candle count, and `LAST_CLOSED` footnotes near Refresh buttons on Levels and Analysis.

4. Pivot Levels engine recalibrated.
   - 1M, 5M, 15M, 30M, 1H, 4H use daily candle context for pivots.
   - 1D and W use weekly candle context for pivots.
   - Prevents tiny pivot ranges caused by using selected timeframe candle OHLC.

5. Levels backend route now loads selected timeframe plus daily and weekly candle bundles.
   - Selected timeframe remains used for Smart S/R, Fibonacci, session levels, nearest action, and confluence.
   - Higher timeframe candle bundles are used for pivot reference OHLC.

## Build verification

- API build: passed
- Frontend build: passed
