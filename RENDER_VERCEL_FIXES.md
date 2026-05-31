# Render + Vercel Fixes Included

## Render backend settings

Runtime: Node
Root Directory: api-server
Build Command: npm install
Start Command: npm start

This ZIP makes `npm start` run `tsx src/index.ts`, so Render no longer needs `dist/index.js`.

## Render environment variables

OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openrouter/free

## Vercel frontend settings

Root Directory: gold-pwa
Build Command: npm run build
Output Directory: dist

After backend is live, add this in Vercel Environment Variables:

VITE_API_BASE_URL=https://your-render-backend.onrender.com
