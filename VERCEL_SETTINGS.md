# Gold Analyzer Pro - Deployment Settings

## Vercel frontend settings

Framework Preset:
```text
Vite
```

Install Command:
```bash
npm ci --registry=https://registry.npmjs.org/ --prefer-offline --no-audit --fetch-retries=5 --fetch-retry-maxtimeout=120000
```

Build Command:
```bash
npm run build
```

Output Directory:
```text
dist
```

Required Vercel Environment Variable for frontend:
```text
VITE_API_BASE_URL=https://YOUR-RENDER-API-URL.onrender.com
```

Do not rely on `TWELVE_DATA_API_KEY` in Vercel unless the API server is also deployed on Vercel. This project normally reads Twelve Data from the backend API server.

## Render / API server environment variables

Add these on the API server deployment, not only Vercel:

```text
TWELVE_DATA_API_KEY=your_real_twelve_data_key
GOLDAPI_KEY=your_goldapi_key_optional
OPENROUTER_API_KEY=your_openrouter_key_optional
```

Important:
- Twelve Data keys are used for XAU/USD candles.
- GoldAPI keys often start with `sk_` and are used only as spot-price validation/fallback.
- Do not paste a GoldAPI `sk_...` key into `TWELVE_DATA_API_KEY`; if you do, the API server will treat it as GoldAPI validation and will still need a real Twelve Data key for candles.
- Yahoo `GC=F` is not used for XAUUSD calculations.
- Yahoo `XAUUSD=X` is disabled unless `ALLOW_YAHOO_SPOT_FALLBACK=true`.
