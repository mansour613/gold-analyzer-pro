# V11.18.5 GoldAPI Provider Patch

- GoldAPI is now the default XAU/USD source.
- Twelve Data is no longer called unless `MARKET_DATA_PROVIDER=twelvedata` or `auto`.
- GoldAPI quote + daily OHLC snapshots are saved into Supabase `market_candle_cache`.
- If GoldAPI fails, backend falls back to Supabase persistent candles.
- Health version bumped to `4.1.1-goldapi`.

Required Render env:

```env
GOLDAPI_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ALLOW_SUPABASE_CACHE=true
MARKET_DATA_PROVIDER=goldapi
```

You can remove `TWELVE_DATA_API_KEY` from Render.
