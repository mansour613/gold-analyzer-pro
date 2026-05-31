# V11.7 Signal History Update

Implemented:

- Signal page now saves today's generated signals per selected timeframe.
- Current best signal is stored automatically when it appears.
- Scan button stores all scanned timeframe signals.
- Signal history displays today's records for the selected timeframe only.
- Daily performance summary added: total, wins, losses, active, win rate, and points.
- Signal status updates from current price: Active, Triggered, TP1 Hit, TP2 Hit, SL Hit.
- Offline-first local storage is used by default.
- Optional Supabase REST sync is included when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured.
- `SUPABASE_SIGNAL_HISTORY.sql` is included for creating the optional table.

Notes:

- Supabase sync is optional; the app still works without it.
- Permanent cross-device history requires Supabase env variables and the included table/policies.
- Browser local storage history is device/browser-specific.
