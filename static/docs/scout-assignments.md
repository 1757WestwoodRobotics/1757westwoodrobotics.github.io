# Scout Assignments

> Automatically assign scouts to teams based on availability windows and workload balance.

[Back to docs index](README.md)

## Setup Requirements

Before assignments can be generated, you need:

1. **Scouts CSV** — A Google Sheet with scout names and availability, published as CSV
2. **TBA API key** — Set as `VITE_TBA_KEY` environment variable
3. **Event key** — Set as `VITE_EVENT_KEY` (defaults to `2026rikin`)
4. **Scouts CSV URL** — Set as `VITE_SCOUTS_CSV_URL`

### Scouts CSV Format

The Google Sheet must have these columns:

| Column | Example | Description |
|--------|---------|-------------|
| Scout Name | Jane Smith | Full name of the scout |
| Start avail day 1 | 4/4/2026 8:00:00 | When the scout is available on day 1 |
| End avail day 1 | 4/4/2026 17:00:00 | When the scout leaves on day 1 |
| Start avail day 2 | 4/5/2026 8:00:00 | When the scout is available on day 2 |
| End avail day 2 | 4/5/2026 17:00:00 | When the scout leaves on day 2 |

Publish the sheet: **File > Share > Publish to web > CSV format**.

## How Assignment Works

The algorithm assigns scouts to matches in batches of 5, balancing workload:

1. **Batching** — Matches are grouped into batches of 5 to give scouts breaks between assignments
2. **Availability check** — Only scouts available during the match time window are considered
3. **Load balancing** — Scouts with the largest gap since their last assignment are picked first
4. **Tiebreaking** — If gaps are equal, the scout with fewer total assignments is chosen
5. **No duplicates** — A scout is never assigned twice in the same batch

Each match needs 6 scouts (one per robot: 3 red alliance + 3 blue alliance).

## Using the Assignments Page

Navigate to `/scouting-assignments`.

### Scouts Panel (Left)

- Lists all scouts with their availability windows
- Shows total assignment count per scout
- Click a scout's name to view their personal timeline

### Assignments Panel (Right)

- **Scout Timeline** — Shows selected scout's matches with break durations between them
- **All Assignments** — Grid showing every match with assigned scouts, separated by alliance
- Match times shown in color: green (actual), blue (predicted), gray (scheduled)

### Match Time Display

| Color | Meaning |
|-------|---------|
| Green | Actual match time from TBA |
| Blue | Predicted time based on schedule |
| Gray | Scheduled time (no prediction available) |

Day separators and end-of-day markers help scouts plan their time.

## Caching

Assignments are cached in your browser's localStorage for **1 hour**. This avoids regenerating assignments on every page load.

- The cache age is displayed on the page
- Click **Refresh** to force regeneration
- Clear browser cache manually: Developer Tools > Application > Local Storage > delete `scouting_assignments_cache`

## Coordinating with the Dashboard

Use **Scout Lead mode** on the [Dashboard](scouting-dashboard.md) to check for coverage gaps. If a match is missing scouting data, check whether the assigned scout was unavailable or reassign manually.

---

See [Troubleshooting](troubleshooting.md) if assignments aren't loading.
