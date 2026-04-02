# Data Format Reference

> Schemas for CSV data, timeline encoding, and API response shapes used by the scouting system.

[Back to docs index](README.md)

## Scouting CSV Columns

These columns appear in the Google Sheet that receives scouting form responses. The dashboard fetches this sheet as CSV.

| Column | Form Field ID | Type | Example |
|--------|--------------|------|---------|
| Scouter Initials | `entry.55361842` | text | `ABC` |
| Match # | `entry.528540297` | number | `12` |
| Team # | `entry.1130076361` | number | `1757` |
| Starting position? | `entry.236449401` | enum | `OT` |
| No Show | `entry.65205079` | checkbox | `no show` |
| Timeline | `entry.2000596765` | serialized | see [Timeline Format](#timeline-format) |
| Auto Climb Result | `entry.287801541` | enum | `No`, `Out`, `Mid`, `Dep`, `F` |
| Alliance won auto? | `entry.901735072` | checkbox | `true` |
| Defended by opponent? | `entry.942649623` | checkbox | `true` |
| Climb Level | `entry.477247024` | enum | `No`, `L1`, `L2`, `L3`, `F` |
| Climb Position | `entry.1268059521` | enum | `No`, `Out`, `Mid`, `Dep` |
| Mech Issue | `entry.676569017` | checkbox | `true` |
| Died | `entry.1940984634` | checkbox | `true` |
| Tipped | `entry.1961795439` | checkbox | `true` |
| Scoring effectiveness? | `entry.975098497` | 0-5 | `4` |
| Scored How? | `entry.1864643366` | enum | `While driving` |
| Scoring Locations | `entry.728375142` | multi | `1`, `2`, `3` |
| Feeding Skill | `entry.2132357592` | 0-5 | `3` |
| Passed How? | `entry.788387708` | enum | `While stationary` |
| Defense Skill | `entry.1384370540` | 0-5 | `2` |
| Card | `entry.1816355809` | enum | `No Card`, `Yellow`, `Red` |
| Comments | `entry.568874806` | text | free text |
| GambleScout prediction | `entry.908293542` | enum | `b` or `r` |

> [!NOTE]
> The CSV uses a 2-row header (row 1 = Google Form internal labels, row 2 = column headers). The dashboard's CSV parser skips the first 2 rows using `parseCSV(text, 2)`.

## Pit Scouting CSV Columns

| Column | Type | Example |
|--------|------|---------|
| Team number | number | `1757` |
| Drive Train Type | text | `Swerve` |
| Frame dimensions | text | `28x28` |
| Weight | text | `120 lbs` |
| Under trench? | text | `Yes` |
| Over bump? | text | `Yes` |
| Drive Coach | text | `Jane Smith` |
| Team Friendliness | text | `Very friendly` |
| Best Auto | text | `3 piece auto` |
| Bot pic | URL | Google Drive image URL |

The pit CSV uses a 1-row header: `parseCSV(text, 1)`.

## Timeline Format

Actions during a match are serialized as a semicolon-delimited string of entries.

### Entry Format

```
{code}:{type}@{time}
```

| Component | Values | Description |
|-----------|--------|-------------|
| `code` | Action code string | Which action was performed |
| `type` | `start`, `stop`, `point` | Start/stop of a held action, or an instant event |
| `time` | Integer (seconds) | Seconds elapsed since the match timer started |

### Example

```
auto_score:start@3;auto_score:stop@8;tele_fuel:point@45;tele_def:start@60;tele_def:stop@90
```

This means:
- Scoring from 3s to 8s during auto (5-second action)
- Fuel scored at 45s during teleop (instant)
- Defense played from 60s to 90s during teleop (30-second action)

### Action Codes

#### Autonomous (Hold-to-Time)

| Code | Action |
|------|--------|
| `auto_score` | Scoring game pieces |
| `auto_pass` | Passing to alliance partners |
| `auto_outpost` | Collecting from outpost |
| `auto_depot` | Collecting from depot |
| `auto_ground` | Collecting from ground |
| `auto_climb` | Climbing |
| `auto_trench` | Traversing the trench |
| `auto_faff` | Wasting time (stuck, confused) |

#### Teleop (Hold-to-Time)

| Code | Action |
|------|--------|
| `tele_score` | Scoring game pieces |
| `tele_coll` | Collecting game pieces |
| `tele_pass` | Passing to alliance partners |
| `tele_faff` | Wasting time |
| `tele_def` | Playing defense |
| `tele_climb` | Climbing |
| `tele_alliance` | In alliance zone |
| `tele_neutral` | In neutral zone |
| `tele_opponent` | In opponent zone |

#### Instant Actions (Tap Counters)

| Code | Action |
|------|--------|
| `auto_fuel` | Fuel scored during auto |
| `tele_fuel` | Fuel scored during teleop |
| `tele_fed` | Fuel fed to alliance partner |

### Action Color Mapping

Used by `getActionColor()` in `utils.js` for Gantt chart visualization:

| Code Contains | Color |
|---------------|-------|
| `score` | Green (`bg-green-500`) |
| `coll`, `outpost`, `depot`, `ground` | Blue (`bg-blue-500`) |
| `pass` | Orange (`bg-orange-500`) |
| `climb` | Purple (`bg-purple-500`) |
| `die` | Red (`bg-red-500`) |
| `card` | Yellow (`bg-yellow-500`) |
| `tip` | Pink (`bg-pink-500`) |
| Other | Gray (`bg-zinc-500`) |

## Starting Position Codes

| Code | Field Position |
|------|---------------|
| `OT` | Outpost Trench |
| `OBFT` | Outpost Bump Favoring Trench |
| `OBFH` | Outpost Bump Favoring Hub |
| `H` | Hub |
| `DBFH` | Depot Bump Favoring Hub |
| `DBFT` | Depot Bump Favoring Trench |
| `DT` | Depot Trench |
| `NS` | No position / no show |

## Climb Enums

### Auto Climb Result

| Value | Meaning |
|-------|---------|
| `No` | No climb attempted |
| `Out` | Output side |
| `Mid` | Middle |
| `Dep` | Depot side |
| `F` | Failed climb |

### Endgame Climb Level

| Value | Meaning |
|-------|---------|
| `No` | No climb |
| `L1` | Level 1 |
| `L2` | Level 2 |
| `L3` | Level 3 |
| `F` | Failed climb |

### Endgame Climb Position

Same as Auto Climb Result: `No`, `Out`, `Mid`, `Dep`.

## Scoring Location Codes

| Value | Location |
|-------|----------|
| `1` | Outpost Trench |
| `2` | Outpost |
| `3` | Hub |
| `4` | Ladder |
| `5` | Depot |
| `6` | Depot Trench |

## Win Probability Formula

The dashboard calculates win probability from EPA difference:

```
winProb = 1 / (1 + 10^((-5/8 * scoreDiff) / score_sd))
```

| Variable | Source | Description |
|----------|--------|-------------|
| `scoreDiff` | Red EPA sum - Blue EPA sum | EPA advantage of red alliance |
| `score_sd` | Statbotics year stats | Standard deviation of scores (default: ~20) |

Result: probability from 0 to 1 that the red alliance wins.

## RP Prediction Thresholds

| Metric | Lit (Likely) | Contention (Possible) | Muted (Unlikely) |
|--------|-------------|----------------------|-------------------|
| RP sum (rp1/rp2/rp3) | > 1.0 | > 0.8 | <= 0.8 |
| Win probability | > 62.5% | 37.5% - 62.5% | < 37.5% |

RP sum = sum of individual team EPA RP values for the 3 alliance teams.

## Test Data Files

Located in `/static/test-data/`. Used by [debug mode](scouting-dashboard.md#debug-mode) and as fallback when API calls fail.

| File | Format | Contents |
|------|--------|----------|
| `scouting.csv` | CSV | 180 mock scouting entries |
| `pit.csv` | CSV | 32 teams of mock pit data |
| `schedule.json` | JSON (TBA format) | 60 qualification matches |
| `playoff-schedule.json` | JSON (TBA format) | 14 playoff matches (8 played, 6 unplayed) |
| `rankings.json` | JSON (TBA format) | 32 team rankings |
| `alliances.json` | JSON (TBA format) | 8 alliance selections |
| `oprs.json` | JSON (TBA format) | OPR values for all teams |
| `teams.json` | JSON | Array of team keys (`["frc61", "frc78", ...]`) |

---

See [Architecture](architecture.md) for how these formats are used in the codebase.
