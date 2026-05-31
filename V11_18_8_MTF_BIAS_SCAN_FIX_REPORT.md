# V11.18.8 Multi-Timeframe Bias Scan Fix

## Fixed
- Analysis page now calls `/api/gold/signals/scan` on page load and refresh.
- Multi-Timeframe Bias cards now receive all timeframe signals from backend instead of only selected/current timeframe.
- Keeps Supabase/MT5 timeframe fallback support for raw labels and clean labels.

## Expected
- W, 1D, 4H, 1H, 30M, 15M, 5M, 1M cards should populate when Supabase has candles for those timeframes.
- Any timeframe with less than enough candles may still show WAIT, but should display RSI/indicator values when backend has data.
