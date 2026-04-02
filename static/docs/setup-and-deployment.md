# Setup & Deployment

> Get the scouting system running locally or deploy to production.

[Back to docs index](README.md)

## Prerequisites

- **Node.js 18** or later
- **npm** (included with Node.js)
- **TBA API key** — [Register at thebluealliance.com](https://www.thebluealliance.com/account)

## Local Development

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` (or next available port).

## Environment Variables

Create a `.env` file in the project root with these variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_TBA_KEY` | Yes | — | The Blue Alliance API key |
| `VITE_EVENT_KEY` | No | `2026rikin` | TBA event key for the competition |
| `VITE_SCOUTING_CSV_URL` | Yes* | — | Published Google Sheets CSV URL for match scouting data |
| `VITE_PIT_CSV_URL` | No | — | Published Google Sheets CSV URL for pit scouting data |
| `VITE_SCOUTS_CSV_URL` | No | — | Published Google Sheets CSV URL for scout roster/availability |
| `VITE_FILTER_TIME` | No | — | ISO timestamp to filter scouting data (e.g., `2026-03-28T09:00:00`) |
| `VITE_PIT_SCOUTING_FORM_URL` | No | — | Google Form URL for pit scouting submissions |

*Not required if using [debug mode](scouting-dashboard.md#debug-mode), which loads from test data.

> [!IMPORTANT]
> All variables must be prefixed with `VITE_` to be accessible in client-side code. Restart the dev server after changing `.env`.

### Example `.env`

```env
VITE_TBA_KEY=your_tba_api_key_here
VITE_EVENT_KEY=2026rikin
VITE_SCOUTING_CSV_URL=https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=0
VITE_PIT_CSV_URL=https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=123456
VITE_SCOUTS_CSV_URL=https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=789
VITE_PIT_SCOUTING_FORM_URL=https://docs.google.com/forms/d/e/FORM_ID/viewform
```

## Google Sheets Setup

The scouting form submits data to a Google Form, which populates a Google Sheet. To connect the dashboard:

1. Open the Google Sheet that receives scouting form responses
2. Go to **File > Share > Publish to web**
3. Select the correct sheet tab and choose **CSV** format
4. Click **Publish** and copy the URL
5. Set `VITE_SCOUTING_CSV_URL` to this URL

Repeat for pit scouting data (`VITE_PIT_CSV_URL`) and scout roster (`VITE_SCOUTS_CSV_URL`).

> [!NOTE]
> The published CSV URL auto-updates when new form responses come in. No manual re-publishing needed.

## Building

```bash
npm run build
npm run preview    # verify the production build locally
```

The build outputs to `./build` using SvelteKit's static adapter with a `404.html` fallback for client-side routing.

## Deployment

### Automatic (GitHub Actions)

Push to the `next` branch to trigger automatic deployment to GitHub Pages.

The workflow (`.github/workflows/AutoDeploy.yml`):
1. Checks out the code
2. Sets up Node.js 18
3. Runs `npm ci` and `npm run build` with environment variables from GitHub Secrets
4. Deploys the `build/` directory to GitHub Pages

### GitHub Secrets

These must be configured in the repository settings (Settings > Secrets and variables > Actions):

| Secret | Maps To |
|--------|---------|
| `TBA_API_KEY` | `VITE_TBA_KEY` |
| `EVENT_KEY` | `VITE_EVENT_KEY` |
| `SCOUTING_CSV_URL` | `VITE_SCOUTING_CSV_URL` |
| `PIT_CSV_URL` | `VITE_PIT_CSV_URL` |
| `PIT_SCOUTING_FORM_URL` | `VITE_PIT_SCOUTING_FORM_URL` |
| `SCOUTS_CSV_URL` | `VITE_SCOUTS_CSV_URL` |

### Manual Deployment

```bash
npm run build
npm run deploy    # pushes build/ to the deployment branch via gh-pages
```

## Updating for a New Season

When preparing for a new competition season:

- [ ] Update `VITE_EVENT_KEY` to the new event key (e.g., `2027txhou`)
- [ ] Create new Google Forms and Sheets for the new season's game
- [ ] Update scouting form fields if game mechanics change
  - Form field `entry.*` IDs map to Google Form question IDs
  - Action button codes (`auto_score`, `tele_def`, etc.) should match new game actions
- [ ] Update starting position options in the form's `posMap` and select elements
- [ ] Update test data files in `/static/test-data/` to match new game format
- [ ] Update environment variables and GitHub Secrets
- [ ] Verify the dashboard's RP prediction labels match the new season's ranking points

---

See [Architecture](architecture.md) for codebase details or [Troubleshooting](troubleshooting.md) for common issues.
