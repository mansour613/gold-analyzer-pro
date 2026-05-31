# Engine Upgrade Report

Added practical working versions of the missing modules:

## Added
- Smart Money / ICT-style engine:
  - Market structure bias
  - Break of structure
  - Change of character
  - Fair Value Gap detection
  - Order Block detection
  - Liquidity zones and swept liquidity

- Signal engine upgraded:
  - Uses EMA/RSI/ATR plus SMC confluence
  - Adds OB/FVG/liquidity reasons into signals

- Levels engine:
  - Pivot levels
  - Smart support/resistance from swing pivots
  - Touch count and strength scoring

- Elliott Wave engine:
  - Pivot-based simplified wave detection
  - Current wave / next wave / projection

- AI page:
  - Strategy buttons send real strategy IDs
  - Gold-only toggle works
  - Importance filter works
  - Events are sent to AI
  - Recent candles are sent to AI

- News backend:
  - Working `/api/news/calendar`
  - Built-in economic events placeholder

## Still not production-grade
- ForexFactory is not scraped or integrated live.
- TradingView drawing tools are not readable by backend.
- Full institutional ICT requires deeper historical datasets and validation.
- Elliott Wave is simplified and should be treated as an estimate.

## Required `.env`
```env
PORT=8080
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openrouter/free
```
