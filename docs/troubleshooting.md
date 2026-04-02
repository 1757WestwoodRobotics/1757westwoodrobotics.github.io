# Troubleshooting

> Common problems and how to fix them at a competition.

[Back to docs index](README.md)

## Scouting Form

### Match data didn't load from TBA

- Check your internet connection
- Verify `VITE_TBA_KEY` is set and the API key is valid
- Verify `VITE_EVENT_KEY` matches the current event
- TBA may not have the schedule posted yet — check [thebluealliance.com](https://www.thebluealliance.com) directly

### "Team is NOT in this match" warning

- Double-check the match number and team number
- The schedule may not be published yet on TBA
- If you're sure the data is correct, continue scouting — the warning is informational

### Timer started accidentally

- Tap **STOP** to pause the timer
- Tap **RESET** to clear all data and start fresh

### Form won't submit

- Check that all required fields are filled: scouter initials, match number, team number, and comments
- Verify your internet connection (the form submits to Google Forms)
- Try refreshing the page and re-entering the data

### Hold buttons aren't registering

- Make sure you're pressing and **holding**, not tapping
- On mobile, avoid accidentally scrolling while holding a button
- The timer must be running (started) for actions to record

## Dashboard

### Data not loading / stuck on loading screen

- Check your internet connection
- Verify `VITE_SCOUTING_CSV_URL` is a published Google Sheets link
- Try **Quick Links > Debug — Quals** to test with sample data
- Open browser console (F12) for specific error messages

### Stale data showing

- The dashboard caches data in your browser for up to 1 hour
- **Hard refresh** (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac) to clear browser cache
- Check that new form responses are actually appearing in the Google Sheet

### Right-click context menu not appearing

- **Desktop**: Right-click on a match cell in the Event Progress or Playoff Progress map
- **Mobile**: Long-press (hold for about 1 second) on a match cell
- Only works on **unplayed** matches — played matches show actual results

### Bracket predictions look wrong

- Check if actual alliance selections have been announced on TBA
- Clear any manual overrides: right-click > "Clear Override" or use the "Clear Overrides" button
- Predictions are based on EPA data — they may differ from your expectations

### RP card tooltips not showing

- Hover over the card with your mouse (desktop only)
- The first three Win cards (duplicates) don't show tooltips — only the first Win card does
- Tooltips require team EPA data to be loaded from Statbotics

### Search/filter not working

- Make sure you're typing a team number, not a team name
- Clear the search bar to reset the filter

## Scout Assignments

### "No scouts loaded"

- Verify `VITE_SCOUTS_CSV_URL` is set in your environment variables
- Check that the Google Sheet is published as CSV (File > Share > Publish to web)
- Verify the CSV has the expected column headers: `Scout Name`, `Start avail day 1`, etc.

### Assignments not updating

- Assignments are cached for 1 hour in localStorage
- Click **Refresh** on the assignments page to regenerate
- Manual clear: browser Developer Tools > Application > Local Storage > delete `scouting_assignments_cache`

### Scout shows 0 assignments

- Check that the scout's availability window covers the match times
- The assignment algorithm checks match times against each scout's day 1 and day 2 availability

## Debug Mode

### Debug mode won't activate

- Open Quick Links menu and click "Debug — Quals" or "Debug — Playoffs"
- If the yellow banner doesn't appear, try refreshing the page

### Can't exit debug mode

- Click "Return to Live Dashboard" on the yellow warning banner
- Or open Quick Links and click "Run Live Dashboard"
- If neither works, clear localStorage and refresh the page

### Debug data looks incomplete

- "Debug — Quals" intentionally excludes playoff data (alliance selections and playoff matches)
- Use "Debug — Playoffs" if you need the full dataset including playoff bracket data

## Development

### Build fails

- Run `npm install` to ensure dependencies are current
- Check Node.js version: `node --version` (requires Node 18+)
- Run `npx svelte-kit sync` if type errors appear
- Check for syntax errors in recently modified `.svelte` files

### Environment variables not working

- Variables must be prefixed with `VITE_` to be accessible in client code
- **Restart the dev server** after changing `.env` — Vite doesn't hot-reload env changes
- Check for typos in variable names

### GitHub Actions deployment fails

- Verify all required secrets are set in repository settings (Settings > Secrets and variables > Actions)
- Check the workflow logs on the Actions tab for specific errors
- The workflow requires: `TBA_API_KEY`, `EVENT_KEY`, `SCOUTING_CSV_URL`

### Local dev server port conflict

- If port 5173 is in use, Vite automatically tries 5174, 5175, etc.
- Check the terminal output for the actual URL
- Kill orphaned Node processes if ports are stuck: `npx kill-port 5173`
