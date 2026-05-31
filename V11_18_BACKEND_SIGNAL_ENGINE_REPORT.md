# V11.18 Backend Signal Engine + Chart Daily Range Fix

## Changes

- Moved signal generation to Render backend via `/api/gold/signal?interval=...`.
- Added backend multi-timeframe signal scan via `/api/gold/signals/scan`.
- Signals now use Render rolling candle cache and backend-calibrated candle history.
- Frontend no longer recalculates signals with heavy local candle arrays.
- Frontend Signals page displays backend signal results only.
- Chart page now shows compact Day High / Day Low from backend quote.
- Day High / Day Low use backend quote values, which are derived from latest real completed candle history when market is closed.

## Why

This reduces mobile freezes and keeps Signals, Levels, and Analysis aligned with the same backend candle cache.

## Deploy Notes

Render env:
- TWELVE_DATA_API_KEY
- GOLDAPI_KEY optional
- OPENROUTER_API_KEY

Vercel env:
- VITE_API_BASE_URL=https://gold-analyzer-pro.onrender.com

After GitHub push:
- Deploy latest commit on Render.
- Redeploy Vercel if it does not auto-deploy.
