# V11.18.7 - MT5 Timeframe Normalization Fix

## Fixed

- Backend Supabase provider now reads both clean MT5 bridge labels and legacy raw MT5 labels.
- Supported clean labels: `M1`, `M5`, `M15`, `M30`, `H1`, `H4`, `D1`, `W1`.
- Supported legacy labels: `1m:0`, `5m:0`, `15m:0`, `30m:0`, `60m:0`, `60m:14400000`, `1d:0`, `1wk:0`.
- This prevents the Analysis page from showing WAIT/0% when Supabase contains candles under older labels.

## MT5 Bridge Fix

- Bridge now reads `MT5_TIMEFRAMES=M1,M5,M15,M30,H1,H4,D1,W1` from `config.env`.
- Bridge saves clean timeframe labels directly into Supabase.
- `requirements.txt` no longer pins the unavailable `MetaTrader5==5.0.45` version.

## Recommended config

```env
MT5_SYMBOL=GOLD#
MT5_TIMEFRAMES=M1,M5,M15,M30,H1,H4,D1,W1
POLL_SECONDS=60
CANDLE_LIMIT=2500
```

## Build check

- Backend `npm run build` passed.
- Frontend `npm run build` passed.
