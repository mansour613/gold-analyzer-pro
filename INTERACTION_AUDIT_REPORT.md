# Gold Analyzer Interaction Audit

## Fixed / connected

### Bottom menu
- Buttons switch pages through App state.
- Active page is highlighted.

### Chart page
- Timeframe buttons update shared market timeframe.
- Signal strip reads from shared signal engine.
- TradingView chart changes interval with selected timeframe.

### Signals page
- Scan All Timeframes button now executes a multi-timeframe scan from current candle data.
- ALL / BULLISH / BEARISH / STRONG filters are active and change visible signal cards.
- Timeframe selector updates current chart/signal state.

### Levels page
- Daily / Weekly segmented buttons now change the pivot calculation.
- Refresh button reloads shared market data.
- Timeframe selector updates market data.

### Waves page
- Timeframe selector and Refresh button are connected.
- Wave map reads from current candle data.
- Note: this is still a simplified wave estimator, not a full Elliott Wave algorithm.

### AI page
- Strategy buttons now send strategy IDs to backend.
- Gold-relevant-only button is now a real toggle.
- Importance buttons are active and sent to backend.
- Backend receives strategy, signal, quote, timeframe, and recent candle context.
- OpenRouter route has fallback model attempts and better response parsing.

## Still basic / not institutional-grade yet
- Signal engine is EMA/RSI/ATR based. It is not full ICT/SMC yet.
- Order Blocks, FVG, liquidity sweeps are not mathematically implemented yet.
- ForexFactory calendar is still placeholder.
- Elliott Wave is simplified.
- Support/resistance touch detection is basic.
- Chart is TradingView widget; backend does not read chart drawings directly.

## Required `.env`
Create `api-server/.env`:

```env
PORT=8080
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openrouter/free
```

Restart backend after editing `.env`.
