# XAUUSD Data Feed Fix

This update changes the backend market-data engine so Signals, Levels, Analysis, and Home are driven by a stricter spot-XAUUSD source chain.

## Primary production source
- `TWELVE_DATA_API_KEY` using `XAU/USD` candles.

## Optional validation sources
- `GOLDAPI_KEY` using `XAU/USD` spot quote.
- `ALPHA_VANTAGE_API_KEY` using XAU to USD exchange rate.
- `metals.live` spot gold quote.

## Explicitly not used
- Yahoo `GC=F` is not used for calculations because it is COMEX gold futures, not spot XAUUSD.

## Legacy fallback
- Yahoo `XAUUSD=X` remains only as a last-resort spot-style fallback when no true API key source is configured. It is guarded by:
  - spot price band validation
  - consensus deviation validation
  - stale/last-candle fallback labeling

## Required Vercel/Render environment variables
Set at least:

```text
TWELVE_DATA_API_KEY=your_key_here
```

Recommended additional validators:

```text
GOLDAPI_KEY=your_key_here
ALPHA_VANTAGE_API_KEY=your_key_here
```

Without `TWELVE_DATA_API_KEY`, the app can still fall back, but the most accurate fix requires the key.
