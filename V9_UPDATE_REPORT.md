# Gold Analyzer Pro V9 Update Report

Build source: last V8 ZIP.

## Completed V9 fixes

### News page
- Removed the visible Gold-relevant-only toggle/filter button.
- Updated AI News Analyst purpose to summarize today's Gold, DXY / USD impact, economic events, and XAUUSD outlook.
- API AI route now returns a local fallback instead of a hard 502 failure when OpenRouter is unavailable.

### Analysis page
- Standardized timeframe labels: 1M, 5M, 15M, 30M, 1H, 4H, 1D, W.
- Removed ICT strategy selector and ICT wording from the analysis UI.
- Removed Waves wording from page subtitle.
- Added Analysis Summary, confidence meter, Gold vs DXY, Elliott Waves visual, ABC Correction, Multi-Timeframe Bias, Analysis Components, Session Context, and News Impact sections.
- Added mobile-first compact layout.

### Levels page
- Reworked pivot logic to use recent candle OHLC rather than broken exaggerated values.
- Added Levels Summary, Pivot Levels, Smart S/R cards, Fibonacci Confluence, Current Fib Zone, and Session Levels.
- Added level strength, touches, distance, breakout-risk style information.

### Chart page
- TradingView chart now hides top toolbar and side toolbar.
- Volume remains hidden.
- Chart area is maximized for mobile.
- Branding now shows by Mansour without the extra S and is styled as a subtle watermark.

### Signals page
- Standardized timeframe labels.
- Subtitle changed to: Live Trade Setups • Multi-Timeframe Confirmation.
- Removed bullish/bearish/strong filter buttons.
- Added best signal focus, signal grade, duration, R:R, status, distance to entry, explanation card, and confidence breakdown.
- Standardized buy/bullish/long as green and sell/bearish/short as red.

### Global UI
- Reduced bottom nav size.
- Improved compact mobile sizing.
- Standardized green/red/gray meaning across pages.

## Verification
- Frontend build passed: npm run build.
- API build passed: npm run build.
