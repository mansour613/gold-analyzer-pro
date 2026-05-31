# Gold Analyzer Pro V11.11 — Market Closed Candle Fallback + Reopen Outlook

## Fixed

- Added a stronger backend fallback chain for XAUUSD data:
  1. live spot-style XAUUSD candle feed
  2. validated in-memory last-good candle cache
  3. metals.live spot validation price
  4. generated fallback candle set around verified spot price when all candle feeds are unavailable

- Restored strict XAUUSD sanity guard to reject suspicious spot prices outside the configured range.
  - Default valid band: 1800–4200
  - Can be overridden using `XAUUSD_MIN_VALID` and `XAUUSD_MAX_VALID` env vars.

- Signals no longer require 50 candles before producing a setup.
  - Minimum reduced to 12 candles.
  - Signal reasons now indicate latest completed candle usage.

- Analysis page now includes a market-reopen outlook card.
  - Uses latest completed candle data when the market is closed.
  - Shows expected bullish/bearish/neutral scenario before market opens.
  - Keeps daily/weekly context visible during closures.

- Added Arabic translations for the market-reopen outlook and fallback-candle labels.

## Build Verification

- API TypeScript build: passed
- Frontend TypeScript + Vite build: passed
