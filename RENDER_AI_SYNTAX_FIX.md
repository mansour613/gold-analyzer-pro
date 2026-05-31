# Render AI Syntax Fix

Fixed `api-server/src/routes/ai.ts`.

The previous file had a malformed literal `\n` inside the TypeScript type block, causing:

`ERROR: Syntax error "n"`

Backend should now start with:

`npm start`

Render settings:
- Root Directory: api-server
- Build Command: npm install
- Start Command: npm start
