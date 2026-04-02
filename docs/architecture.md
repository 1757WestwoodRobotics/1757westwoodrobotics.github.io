# Architecture

> SvelteKit static site with client-side data fetching from TBA, Statbotics, and Google Sheets. All processing happens in the browser — there is no backend server.

[Back to docs index](README.md)

## Tech Stack

| Technology | Purpose |
|------------|---------|
| SvelteKit 2 | Application framework |
| Svelte 4 | Component syntax (`export let`, `on:click`, `{#each}`) |
| Tailwind CSS | Styling (dark theme, zinc-900 backgrounds) |
| Chart.js + svelte-chartjs | Performance trend graphs |
| @sveltejs/adapter-static | Builds to static HTML/JS for GitHub Pages |
| GitHub Actions | Auto-deployment from `next` branch |

## Project Structure

```
src/
  routes/
    scouting/+page.svelte                    # Scouting form (~560 lines)
    scouting-dashboard/+page.svelte           # Main dashboard (~4300 lines)
    scouting-assignments/+page.svelte         # Scout assignments (~940 lines)
  components/
    scoutingDashboard/
      CoverageMap.svelte                      # Match coverage grid
      CoverageMapButton.svelte                # Individual coverage cell with long-press
      EventProgressMap.svelte                 # Quals prediction map with overrides
      PlayoffProgressMap.svelte               # Playoff bracket visualization
      RPCards.svelte                          # Ranking point prediction cards
      SimulatorHeader.svelte                  # Simulator alliance header display
      SimulatorTeamCard.svelte                # Team card with stats and autocomplete
      ContextMenu.svelte                      # Right-click menu for simulator loading
      OverrideContextMenu.svelte              # Right-click menu for match overrides
      utils.js                                # Shared utilities
static/
  test-data/                                  # Fallback data for debug mode
.github/
  workflows/AutoDeploy.yml                    # GitHub Pages deployment
```

## Data Flow

```
Google Forms  →  Google Sheets  →  Published CSV  →  Dashboard (client-side fetch)
                                                         ↕
TBA API  ────────────────────────────────────────→  Dashboard (schedule, rankings, alliances)
                                                         ↕
Statbotics API  ─────────────────────────────────→  Dashboard (EPA, match predictions)
                                                         ↕
FRC Colors API  ─────────────────────────────────→  Dashboard (team color theming)
```

1. Scouts fill out the scouting form at `/scouting` during matches
2. Form data submits to Google Forms, which populates a Google Sheet
3. The dashboard fetches the Sheet as CSV via the published URL
4. The dashboard also fetches TBA and Statbotics data for EPA, schedule, and rankings
5. All data processing (filtering, sorting, aggregation, predictions) happens client-side

## External APIs

| API | Base URL | Auth | Used For |
|-----|----------|------|----------|
| The Blue Alliance | `thebluealliance.com/api/v3` | `X-TBA-Auth-Key` header | Schedule, rankings, OPRs, alliances, team details |
| Statbotics | `api.statbotics.io/v3` | None (public) | EPA ratings, match predictions, year statistics |
| FRC Colors | `api.frc-colors.com/v1` | None (public) | Team primary/secondary hex colors |
| Google Sheets | Published CSV URL | None (public link) | Scouting data, pit data, scout roster |
| Google Forms | Form submission URL | None | Scouting form target |

## Key Patterns

### Hold-to-Time Buttons

The scouting form uses `mousedown`/`touchstart` to begin timing an action and `mouseup`/`touchend` to stop. Each press creates a `start` timeline entry and each release creates a `stop` entry. Duration = stop time - start time.

### Timeline Serialization

Actions are encoded as `code:type@time` entries joined by semicolons. The `parseActions()` function in `utils.js` deserializes this into structured objects. The `getGanttData()` function converts these into Gantt chart visualization data.

### Debug Mode

A `debugMode` state variable (`null`, `'quals'`, or `'playoffs'`) controls whether fetch functions hit live APIs or load from `/static/test-data/`. When active, CSV fetches redirect to test CSV files and TBA fetches go straight to local JSON fallbacks.

### Context Menus

Two interaction patterns for the same action:
- **Desktop**: `contextmenu` event (right-click) opens a positioned menu
- **Mobile**: `pointerdown` with a 600ms `setTimeout` triggers long-press behavior
- Both pointer handlers filter `e.button !== 0` to prevent right-click from triggering left-click actions

### Reactive Derivations

The dashboard makes heavy use of Svelte's `$:` reactive statements. The playoff bracket simulation, for example, chains through multiple reactive blocks:

```
teamStatsMap → allianceSimulation → effectiveAlliances → bracketSimulation
```

Map-based reactivity uses an IIFE pattern to ensure Svelte tracks changes:
```js
$: bracketSimulation = ((overrides) => { /* ... */ })(playoffOverrides);
```

### LocalStorage Caching

- **Dashboard**: Caches scouting data, team stats, colors, and details for 1 hour
- **Assignments**: Caches generated assignments for 1 hour
- Debug mode clears the cache on activation/deactivation

## Component Responsibilities

| Component | Props (Key) | Responsibility |
|-----------|-------------|----------------|
| `CoverageMap` | schedule, searchTerm, getScouterCount | Renders grid of match coverage cells |
| `CoverageMapButton` | match, scouterCount, breakdown | Single coverage cell with hover tooltip |
| `EventProgressMap` | schedule, matchPredictions, hoveredMatch | Quals progress grid with click/override handlers |
| `PlayoffProgressMap` | bracketMatches, alliances, playoffOverrides | Playoff match grid with override support |
| `RPCards` | alliance, predictions (with reasons) | 6 RP indicator cards with hover tooltips |
| `SimulatorHeader` | alliance, teams, epa, opr | Alliance summary bar in simulator |
| `SimulatorTeamCard` | team, stats, suggestions | Team input card with autocomplete |
| `ContextMenu` | contextMenu, match | Right-click menu: "Load in Simulator" |
| `OverrideContextMenu` | contextMenu, matchLabel, redLabel, blueLabel | Right-click menu: override/clear match prediction |

## Utility Functions (`utils.js`)

| Function | Signature | Purpose |
|----------|-----------|---------|
| `getVal` | `(obj, key) → string` | Safe property accessor, returns `''` if missing |
| `parseActions` | `(actionStr) → [{code, type, time}]` | Parse timeline string into sorted action array |
| `getGanttData` | `(actionStr) → [{code, events}]` | Convert timeline into Gantt chart data structure |
| `getActionColor` | `(code) → string` | Map action code to Tailwind CSS color class |

---

See [Data Format Reference](data-format-reference.md) for detailed schemas or [Setup & Deployment](setup-and-deployment.md) for configuration.
