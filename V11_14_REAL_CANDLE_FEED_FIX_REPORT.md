# V11.14 Real Candle Feed Fix

Applied to backend price/candle validation.

## Fixes
- Updated XAUUSD validation range from the outdated 1800-4200 guard to 1000-10000 so valid current XAUUSD prices around 4540 are accepted.
- Disabled synthetic/fake fallback candles by default. Signals, Levels, and Analysis now require real Twelve Data OHLC candles or a real in-memory last-closed-candle cache.
- Added `ALLOW_SYNTHETIC_CANDLE_FALLBACK=false` guidance.
- Updated `.env.example` safety range and fallback defaults.

## Required Render env
```
TWELVE_DATA_API_KEY=your_real_twelve_data_key
GOLDAPI_KEY=your_goldapi_key_optional
XAUUSD_MIN_VALID=1000
XAUUSD_MAX_VALID=10000
ALLOW_SYNTHETIC_CANDLE_FALLBACK=false
```

## Expected API behavior
- `/api/gold/quote` should accept a valid 4540 XAUUSD quote instead of rejecting it.
- `/api/gold/candles` should return real Twelve Data candles with source `twelvedata:XAU/USD` or `twelvedata:XAU/USD+validated`.
- If Twelve Data fails, the API should not silently generate fake candle history unless explicitly enabled for emergency debugging.
