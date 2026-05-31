# Gold Analyzer Pro V11.5 Fix Report

Implemented from the last ZIP:

1. Live-data freshness validation
   - Backend now returns last candle timestamp and data age.
   - Frontend detects stale candle data by timeframe.
   - Home market card displays a stale-data warning instead of silently showing old data.

2. Unified data-source labels
   - Chart page now clearly notes TradingView/FusionMarkets for the visible chart and backend candle feed for calculations.
   - Context tracks candle source and data age.

3. Arabic cleanup pass
   - Added missing Arabic keys for stale data, AI fallback, news labels, points, high/low, neutral, impulse, wave, support.
   - Replaced several hardcoded English labels on News, Levels, and Analysis pages with translation keys.

4. Removed old WavesPage file
   - Deleted the unused legacy WavesPage component to avoid confusion now that AnalysisPage is active.

5. Build verification with dependencies installed
   - Ran npm install and npm run build in gold-pwa.
   - Ran npm install and npm run build in api-server.
   - Both builds passed.
