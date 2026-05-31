# V11.13 Twelve Data / GoldAPI Feed Fix

## Fixed

- Verified the app's frontend reads market data from `/api/gold/quote` and `/api/gold/candles`.
- Confirmed the real XAUUSD data logic belongs in `api-server/src/services/marketData.ts`.
- Strengthened Twelve Data integration for XAU/USD candles.
- Added support for alternate Twelve Data environment variable names:
  - `TWELVE_DATA_API_KEY`
  - `TWELVEDATA_API_KEY`
  - `TWELVE_DATA_KEY`
- Prevented GoldAPI `sk_...` keys from being accidentally sent to Twelve Data.
- Added fallback handling so a GoldAPI `sk_...` key pasted into `TWELVE_DATA_API_KEY` is treated as GoldAPI validation, but still requires a true Twelve Data key for candles.
- Disabled Yahoo `XAUUSD=X` spot fallback by default.
- Kept Yahoo `GC=F` out of XAUUSD calculations.
- Added `ALLOW_YAHOO_SPOT_FALLBACK=false` emergency flag.
- Updated Vercel/Render settings documentation.

## Build Verification

- API build passed.
- Frontend build passed.

## Required Environment Variables

### Vercel frontend
`VITE_API_BASE_URL=https://YOUR-API-SERVER.onrender.com`

### API server / Render
`TWELVE_DATA_API_KEY=your_real_twelve_data_key`

Optional:
`GOLDAPI_KEY=your_goldapi_key`
