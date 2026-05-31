# Option 3 Added: Online News Feed + AI

## Added
- `/api/news/headlines`
- Fetches online RSS headlines from:
  - Yahoo Finance Gold futures
  - Yahoo Finance Dollar Index
  - MarketWatch MarketPulse
- Classifies each headline:
  - goldRelevant
  - low / medium / high impact
  - tags such as gold, fed, cpi, inflation, dollar, treasury, yield
- AI page auto-refreshes news every 5 minutes
- AI prompt sends live headlines to OpenRouter
- News Scalping strategy now uses headlines more directly

## Notes
- This avoids ForexFactory because it has no official public API.
- RSS sources can occasionally fail or change.
- For production, consider Trading Economics, FMP, Finnhub, or EODHD.
