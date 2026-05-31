# Gold Analyzer Pro V11.9 Pending Fixes Build Report

Applied on top of `gold-analyzer-pro-v11-8-rebuilt-live-spot-data.zip`.

## Implemented updates

1. Pivot Levels UI redesign
   - Compact pivot rows
   - Aligned level, price, and distance columns
   - Added current price marker inside pivot list
   - Added nearest action card

2. Refresh buttons recalibrate live data
   - Levels, Signals, and Analysis refresh buttons now show refreshing/done state
   - Refresh actions call the live market refresh function and update timestamps/calculations

3. Signal timeframe-specific live signals and history
   - Selected timeframe is shown clearly
   - Refresh applies to the selected timeframe
   - History remains filtered by selected timeframe

4. Signal Reasoning Panel
   - Existing reason panel kept and improved with localized reason text

5. Signal Age & Freshness
   - Signal page shows signal age based on latest refresh time
   - Stale feed warning displayed when market data is stale

6. Timeframe Alignment Score
   - Signals page shows an alignment percentage based on multi-timeframe scan results

7. Levels Nearest Action
   - Levels page now shows nearest action: resistance ahead or support holding

8. Analysis Market State
   - Analysis page now shows Trending / Ranging / Breakout market state
   - Includes updated-age context

9. News Impact Warning
   - News page now highlights high-impact events within the next 2 hours
   - Shows elevated signal-risk warning

10. Trade Journal Foundation
   - Signal cards now include Save Trade button
   - Saved trades are stored in localStorage as a lightweight journal foundation

11. Arabic language update
   - Added Arabic translations for new V11.9 labels
   - Added support for market state, signal age, nearest action, journal, refresh, and news warning labels

## Build verification

- Frontend build: passed
- API build: passed
