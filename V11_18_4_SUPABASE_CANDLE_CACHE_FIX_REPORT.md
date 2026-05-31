# V11.18.4 Supabase Candle Cache Fix

## Fixed root problem
Render memory cache was lost after sleep/restart/redeploy. That made the app show `--`, unavailable levels, or no weekend/closed-market analysis.

## What changed
- Backend now saves valid XAUUSD candle history to Supabase table `market_candle_cache` after successful Twelve Data fetches.
- If Twelve Data is unavailable, empty, or market is closed and Render memory cache is empty, backend loads the last completed real candles from Supabase.
- Quote, candles, signal, levels, scan, and analysis routes now keep working from real cached OHLC data after Render restarts.
- Synthetic candle fallback remains disabled unless explicitly enabled.

## Required Supabase SQL
Run the SQL block added to `SUPABASE_SIGNAL_HISTORY.sql`.

## Required Render env variables
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ALLOW_SUPABASE_CACHE=true
SUPABASE_CANDLE_CACHE_TABLE=market_candle_cache
```

Keep the existing:
```env
TWELVE_DATA_API_KEY=your_real_twelve_data_key
```

## Important behavior
The Supabase table is populated only after the backend successfully fetches real Twelve Data candles at least once. After that, weekend/closed-market fallback survives Render sleep/restarts.
