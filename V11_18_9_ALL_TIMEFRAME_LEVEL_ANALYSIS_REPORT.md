# V11.18.9 - All Timeframe Levels + Analysis Scan

## User requirement
- Levels and Analysis must auto-read all saved MT5/Supabase timeframes.
- The selected timeframe should only control the focused/current timeframe view.
- Multi-timeframe analysis should not depend on the selected timeframe only.

## Fixes
- Backend `/api/gold/levels` now loads all configured analysis frames: `1m,5m,15m,30m,1h,4h,1d,1wk`.
- Backend `/api/gold/analysis` now loads all configured analysis frames: `1m,5m,15m,30m,1h,4h,1d,1wk`.
- The selected `interval` still controls the main/focused levels and analysis calculation.
- Responses now include `allTimeframes` summaries so the frontend can display/read all timeframe results.
- Levels page now shows an All Timeframe Levels summary block.
- Analysis page can use all-timeframe backend analysis summaries for the Multi-Timeframe Bias cards and falls back to `/signals/scan`.

## Expected behavior
- Choosing 15M shows focused 15M levels/analysis.
- Multi-Timeframe Bias and All Timeframe Levels still read M1/M5/M15/M30/H1/H4/D1/W1.
- If Supabase contains those timeframes, the app should populate them without manually selecting each one.

## Build verification
- Backend `npm run build`: passed.
- Frontend `npm run build`: passed.
