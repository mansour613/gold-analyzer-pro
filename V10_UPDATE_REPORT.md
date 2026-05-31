# Gold Analyzer Pro V10 Update Report

Built from the last V9 ZIP.

## Completed
- Fixed News AI request to use the configured API base URL instead of hardcoded `/api/ai/analysis`.
- Added local fallback summary so News AI no longer shows a raw red error box when OpenRouter/API is unavailable.
- Improved Arabic translations for key pages, buttons, subtitles, errors, and RTL behavior.
- Replaced TradingView iframe chart page with a Lightweight Charts implementation to support custom level overlays.
- Added Chart Page Show/Hide Levels toggle.
- Added horizontal chart level lines for R1/R2/R3, PP, current price, S1/S2/S3, and Fibonacci levels.
- Moved/kept the compact signal strip above the chart.
- Cleaned chart signal bar colors: dark background with green/red/gray accents instead of full bright cards.
- Added 1M, 5M, 15M, 30M, 1H, 4H, 1D, W timeframe labels on Chart and other pages.
- Reduced layout density on Signals, Analysis, and Levels pages using compact cards, smaller spacing, and smaller typography.
- Added a new borderless dark app icon with gold trading accents.
- Updated apple-touch-icon and favicon references.

## Build Verification
- Frontend build passed: `npm run build`
- API build passed: `npm run build`

## Notes
- The chart overlay uses local candle/pivot/Fibonacci calculations from the current app data.
- News AI fallback is intentionally useful even without OpenRouter so users do not see a broken UI.
