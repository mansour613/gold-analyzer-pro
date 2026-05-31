# V11.18.6 MT5 Bridge + Supabase Provider

Changes:
- Render backend can run in `MARKET_DATA_PROVIDER=supabase` mode.
- Backend reads real XAUUSD candles from Supabase only.
- No TwelveData, GoldAPI, Yahoo, or OANDA calls are required in this mode.
- Windows MT5 bridge uploads candles into `market_candle_cache`.
- Web frontend continues reading Render endpoints as before.

Required Render env:
```env
MARKET_DATA_PROVIDER=supabase
ALLOW_SUPABASE_CACHE=true
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_CANDLE_CACHE_TABLE=market_candle_cache
```

Required PC bridge env:
```env
MT5_SYMBOL=XAUUSD
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```
