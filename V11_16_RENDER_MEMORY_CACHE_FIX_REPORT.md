# Gold Analyzer Pro V11.16 — Render Rolling Candle Cache / Performance Fix

## What changed

- Added a backend Render memory rolling candle cache per timeframe.
- The cache merges new candles with existing candles by timestamp and removes the oldest candles when limits are reached.
- The frontend no longer receives huge candle payloads by default; API responses are trimmed to mobile-safe sizes.
- Intraday request windows were reduced to avoid freezing the mobile app:
  - 1M: 5 days
  - 5M: 1 month
  - 15M / 30M: 2 months
  - 1H: 3 months
  - 4H: 6 months
  - 1D: 1 year
  - W: 5 years
- The backend still keeps enough rolling history for strategy calibration without growing memory forever.

## Cache limits

Default rolling cache limits:

- 1M: 700 candles
- 5M: 1200 candles
- 15M: 1800 candles
- 30M: 1800 candles
- 1H: 2200 candles
- 4H: 2200 candles
- 1D: 1200 candles
- W: 600 candles

Default frontend response limits:

- 1M: 300 candles
- 5M: 500 candles
- 15M / 30M: 800 candles
- 1H / 4H: 1000 candles
- 1D: 500 candles
- W: 300 candles

## Behavior

- New data overwrites/merges by candle timestamp.
- Oldest candles are deleted automatically when the cache reaches its limit.
- Render restart clears memory cache; the API rebuilds it from Twelve Data on first request.
- No Supabase storage is required for candle history.

## Build verification

- API build passed.
- Frontend build passed.
