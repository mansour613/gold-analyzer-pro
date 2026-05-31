# Gold Analyzer Pro V11.17 Backend Engine Restructure

## Purpose
This build moves the expensive Levels and Analysis calculations away from the mobile React frontend and into the Render API backend so pages stop freezing and calculations use the Render rolling candle cache.

## Backend changes
- Added `api-server/src/services/strategy.ts`.
- Added `/api/gold/levels?interval=...`.
- Added `/api/gold/analysis?interval=...`.
- Levels endpoint calculates from backend candle cache:
  - Pivot levels
  - Smart support/resistance
  - Session highs/lows
  - Fibonacci confluence
  - Nearest action
  - Source/debug metadata
- Analysis endpoint calculates from backend candle cache:
  - Market state
  - Bias/confidence
  - Momentum/RSI/EMA/ATR
  - Price action summary
  - Support/resistance context
  - DXY relationship
  - Reopen/last-candle outlook

## Frontend changes
- Levels page now fetches backend `/api/gold/levels` and displays backend-calibrated levels.
- Analysis page now fetches backend `/api/gold/analysis` and displays backend-calibrated market state and price action.
- Removed all-timeframe prefetch on mobile page load from `MarketContext.tsx`.
- Frontend now keeps selected timeframe candles locally only; Render handles rolling historical cache.
- Existing frontend engines remain as fallback only when backend endpoint is unavailable.

## Performance fixes
- Prevents Promise.all loading of every timeframe on page open.
- Reduces large candle arrays in React state.
- Keeps heavy calculations server-side.
- Adds lightweight debug/source info for Levels and Analysis.

## Expected result
- Levels page should be more responsive.
- Analysis page should be more responsive.
- Timeframe changes should use backend-calibrated data.
- Render memory cache becomes the main candle-history source for calculations.
