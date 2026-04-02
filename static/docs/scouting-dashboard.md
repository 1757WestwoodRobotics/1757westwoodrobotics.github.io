# Scouting Dashboard Guide

> Analyze scouting data, predict match outcomes, and prepare for alliance selection. The dashboard pulls data from multiple sources and provides seven analysis modes.

[Back to docs index](README.md)

## Getting Started

Navigate to `/scouting-dashboard`. The dashboard automatically loads data from:

- **Google Sheets** — Scouting and pit data submitted through the forms
- **The Blue Alliance** — Match schedule, rankings, OPRs, and alliance selections
- **Statbotics** — EPA (Expected Points Added) ratings and match predictions
- **FRC Colors** — Team color theming

Loading indicators show progress for each data source. If a source fails, the dashboard continues with available data.

## Dashboard Modes

Toggle between modes using the buttons at the top. Only one mode is active at a time.

### Leaderboard (Default)

The default view when you open the dashboard.

- All teams ranked by EPA from Statbotics
- Sortable columns for EPA, OPR, and scouting averages
- Click any team row to expand match-by-match scouting detail
- Use the search bar to filter by team number

### Simulator

Compare two alliances in a 3v3 simulation.

- Enter team numbers in the three red and three blue slots
- View aggregated EPA, OPR, and win probability
- **RP Prediction Cards** show Ranking Point likelihood for each alliance (Energized, Supercharged, Traversal, Win)
- Hover over any RP card to see the per-team EPA breakdown and threshold reasoning
- Performance charts show trends for each team

**Loading matches into the simulator:**
- Click any match in the Event Progress or Playoff Progress maps
- Right-click a match in the Coverage Map and select "Load in Simulator"
- Long-press a match on mobile to load it

### Alliance Selection Mode

EPA-ranked pick list for alliance selection.

- Teams ranked by EPA with optimal alliance pairings
- Simulates the 8-alliance snake draft order
- Click teams to cross them off as they're picked by other alliances
- Updates in real time as the draft progresses

### Defense Mode

Defensive effectiveness analysis.

- Teams ranked by defense skill ratings from scouting data
- Filters for defense-specific metrics
- Helps identify strong defenders for alliance strategy

### Overview Mode

Single-team deep dive.

- Select a team to view all their match data in one place
- **Performance trend charts** — Line graphs across matches for scoring, feeding, and defense
- **Action timelines** — Gantt-style visualization of what the robot did during each match
- **Starting position distribution** — Where the team typically starts
- **Pit scouting data** — Robot specs and photos (if available)
- **Consistency metrics** — Early-game vs. late-game effectiveness

### Pit Mode

Pit scouting data display.

- Shows pit scouting responses for each team
- Drive train type, frame dimensions, weight, and capabilities
- Image viewer for robot photos with pinch-to-zoom on mobile

### Scout Lead Mode

Assignment management and coverage tracking.

- Shows matches with missing scouting coverage
- Lists which teams still need to be scouted per match
- Use between matches to identify and fill coverage gaps
- Cross-reference with the Coverage Map for a visual overview

## Visual Components

### Coverage Map

A grid showing which team/match combinations have been scouted.

- **Green** = Fully scouted (all 6 robots in the match have data)
- **Partial** = Some robots scouted, some missing
- **Empty** = No scouting data for this match
- Right-click any match to load it into the simulator

### Event Progress Map (Quals)

A color-coded grid of all qualification matches showing predictions and results.

| Color | Meaning |
|-------|---------|
| Muted red | Red alliance won (actual result) |
| Muted blue | Blue alliance won (actual result) |
| Bright red | Red predicted to win (unplayed) |
| Bright blue | Blue predicted to win (unplayed) |
| Gray | Toss-up (close prediction) |
| Yellow ring | Manual override applied |

- Hover over any match for a tooltip showing teams and prediction details
- Click to load the match into the simulator

### Playoff Progress Map

A compact grid of all playoff bracket matches (M1-M14).

- Same color scheme as the Event Progress Map
- Predictions flow through the double-elimination bracket
- Override any unplayed match to see how results cascade

### RP Prediction Cards

Six cards per alliance in the simulator showing Ranking Point predictions:

| Card | RP Type | Threshold |
|------|---------|-----------|
| Energized | RP1 | Sum of team EPA RP1 values |
| Supercharged | RP2 | Sum of team EPA RP2 values |
| Traversal | RP3 | Sum of team EPA RP3 values |
| Win (x3) | Win bonus | EPA-based win probability |

**Card states:**
- **Lit** (bright color) — Likely (RP sum > 1.0 or win prob > 62.5%)
- **Contention** (dim color) — Possible (RP sum > 0.8 or win prob 37.5-62.5%)
- **Muted** (gray) — Unlikely (RP sum <= 0.8 or win prob < 37.5%)

Hover over any card for the detailed breakdown.

### Playoff Bracket

Full double-elimination bracket display showing all 14 matches:

- **Upper Bracket**: Round 1 (M1-M4), Round 2 (M5-M6), Upper Final (M7)
- **Lower Bracket**: Lower Round 2 (M8-M9), Lower Round 3 (M10-M11), Lower Round 4 (M12), Lower Final (M13)
- **Grand Finals**: M14 (+ optional M15 tiebreaker)

Click any match to load those alliance teams into the simulator.

## What-If Overrides

Override any match prediction to explore "what-if" scenarios. Overrides cascade through the bracket and ranking predictions.

**Desktop:** Right-click on an unplayed match card → select "Override Red", "Override Blue", or "Clear Override"

**Mobile:** Long-press (hold ~1 second) on an unplayed match card to cycle through override options

**Clearing overrides:**
- Right-click → "Clear Override" clears a single match
- "Clear Overrides" button (next to section headers) clears all overrides in that section

> [!NOTE]
> For playoff matches, the override menu shows "Override Alliance {N}" instead of red/blue, since playoff alliances don't correspond to a fixed color.

## Quick Links Menu

Access external tools and debug options from the Quick Links dropdown:

| Link | Destination |
|------|-------------|
| Pit Scouting Form | Google Form for pit data (if configured) |
| Scouting Form | `/scouting` form page |
| Scouting Assignments | `/scouting-assignments` page |
| TBA Event | The Blue Alliance event page |
| Statbotics | Statbotics event page |
| Help Docs | This documentation |

### Debug Mode

> [!WARNING]
> Debug mode loads fake test data. Don't activate this during a real competition.

Access via Quick Links:

- **Debug — Quals**: Loads test qualification data. Playoffs run in pure prediction mode (no actual alliances).
- **Debug — Playoffs**: Loads all test data including playoff results and alliance selections.
- **Run Live Dashboard**: Returns to live API data (only shown when debug mode is active).

A yellow warning banner appears at the top of the dashboard when debug mode is active.

## Other Features

- **Fullscreen mode** — Toggle with the fullscreen button in the header
- **Team search** — Type a team number to filter all views
- **Data caching** — Data is cached in your browser for 1 hour. Hard refresh (Ctrl+Shift+R) to force a reload.
- **Match videos** — YouTube match videos can be embedded when available

---

See [Troubleshooting](troubleshooting.md) if data isn't loading or features aren't working.
