# Gold Analyzer Pro V4 Working

Clean working VS Code project.

## Backend

```bash
cd api-server
npm install
npm run dev
```

Runs on:

```text
http://localhost:8080
```

Test:

```text
http://localhost:8080/api/health
http://localhost:8080/api/gold/quote
http://localhost:8080/api/gold/candles?interval=15m&range=5d
```

## Frontend

Open a second terminal:

```bash
cd gold-pwa
npm install
npm run dev
```

Runs on:

```text
http://localhost:5173
```

## Notes

- Full English / Arabic UI toggle.
- RTL support for Arabic.
- Mobile-first dark/gold theme.
- Pages: Chart, Signals, Levels, Waves, AI.
- No Replit catalog dependencies.
- No missing imports.
- No node_modules included.


## Gemini AI setup

Create this file locally:

```text
api-server/.env
```

Add:

```env
PORT=8080
GEMINI_API_KEY=your_gemini_api_key_here
```

Restart backend:

```bash
cd api-server
npm install
npm run dev
```

Do not commit `.env` to GitHub.


## AI setup

Create this file locally only:

```text
api-server/.env
```

Add your Gemini key:

```env
PORT=8080
GEMINI_API_KEY=paste_your_real_gemini_key_here
```

Restart backend:

```bash
cd api-server
npm install
npm run dev
```

Do not upload `.env` to GitHub.


## OpenRouter AI setup

Create:

```text
api-server/.env
```

Add:

```env
PORT=8080
OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_MODEL=deepseek/deepseek-chat-v3-0324:free
```

Then restart backend:

```bash
cd api-server
npm install
npm run dev
```

If AI returns no text, try another free OpenRouter model.
