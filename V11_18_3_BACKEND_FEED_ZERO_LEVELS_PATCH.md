# V11.18.3 Backend Feed + Zero Levels Patch

Patched issues from the 4:26 screenshots:

- Backend no longer depends only on Twelve Data when the env key is missing after deployment.
  - If `TWELVE_DATA_API_KEY` is missing/invalid, backend automatically tries real Yahoo `XAUUSD=X` spot candles.
  - If a valid Twelve Data key exists, Yahoo remains opt-in unless `ALLOW_YAHOO_SPOT_FALLBACK=true`.
- Day High / Day Low now come from the same UTC trading day as the last candle, not a rolling 24h mix.
- Quote route uses the latest valid daily candle for chart cards, so Sunday/market-closed shows Friday's completed daily candle.
- Levels page no longer displays fake `$0.00` pivots, nearest support, or nearest resistance.
  - If backend data is unavailable, UI shows `--` / unavailable instead of zeros.
- Levels page timestamp now shows `Not updated` instead of `Updated Not updated`.
- Frontend market refresh no longer fails the whole screen when quote fails but candles are available.
  - It builds a safe quote from backend candles when possible.
- Rebuilt backend `dist/` and frontend `dist/` for direct deployment.

Deployment note:
- Best production setup is still to add `TWELVE_DATA_API_KEY` in Render.
- This patch adds a real no-key fallback so the app does not show blank quote/levels after env resets.
