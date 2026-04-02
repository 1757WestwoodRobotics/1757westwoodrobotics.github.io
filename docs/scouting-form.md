# Scouting Form Guide

> Collect match data by holding buttons while robots perform actions. The form captures timing data, performance ratings, and observer comments.

[Back to docs index](README.md)

## Before the Match

### Pre-Match Fields

| Field | Required | Description |
|-------|----------|-------------|
| Scouter Initials | Yes | Your initials (identifies who scouted) |
| Match Number | Yes | The qualification match number |
| Team Number | Yes | The team you're assigned to watch |
| Starting Position | Yes | Where the robot starts on the field |
| No Show | No | Check if the robot doesn't appear on the field |

### TBA Auto-Fetch

When you enter a **match number**, the form automatically fetches alliance data from The Blue Alliance:

- Displays red and blue alliance team numbers (R1, R2, R3 / B1, B2, B3)
- Validates your team number is in the match (green = correct, red = wrong match)
- Loads Statbotics win predictions for GambleScout

### Starting Positions

| Code | Position |
|------|----------|
| OT | Outpost Trench |
| OBFT | Outpost Bump Favoring Trench |
| OBFH | Outpost Bump Favoring Hub |
| H | Hub |
| DBFH | Depot Bump Favoring Hub |
| DBFT | Depot Bump Favoring Trench |
| DT | Depot Trench |
| NS | No position / no show |

### GambleScout (Optional)

A fun prediction game that appears after match data loads. Predict which alliance wins — you can only gain points, never lose them. Point values are weighted by how unlikely your pick is (betting on the underdog pays more).

## During the Match: Autonomous

> [!IMPORTANT]
> **Hold-to-time buttons**: Press and hold while the robot performs the action. Release when the action ends. The duration is recorded automatically.

### Autonomous Action Buttons

| Button | Code | What to Track |
|--------|------|---------------|
| SCORING | `auto_score` | Robot is actively scoring game pieces |
| PASSING | `auto_pass` | Robot is passing game pieces to alliance partners |
| OUTPOST COLL | `auto_outpost` | Robot is collecting from the outpost |
| DEPOT COLL | `auto_depot` | Robot is collecting from the depot |
| GROUND COLL | `auto_ground` | Robot is collecting from the ground |
| CLIMBING | `auto_climb` | Robot is attempting to climb |
| TRENCH | `auto_trench` | Robot is traversing the trench |
| FAFFING | `auto_faff` | Robot is wasting time (stuck, confused, etc.) |

### Auto Climb Result

After autonomous ends, select the climb result:

| Option | Meaning |
|--------|---------|
| No | Did not attempt climb |
| Output Side | Climbed on output side |
| Middle | Climbed in the middle |
| Depot Side | Climbed on depot side |
| Failed Climb | Attempted but failed |

## During the Match: Teleop

Same hold-to-time pattern with teleop-specific actions:

### Teleop Action Buttons

| Button | Code | What to Track |
|--------|------|---------------|
| SCORING | `tele_score` | Robot is actively scoring |
| COLLECTING | `tele_coll` | Robot is collecting game pieces |
| PASSING | `tele_pass` | Robot is passing to partners |
| FAFFING | `tele_faff` | Robot is wasting time |
| DEFENSE | `tele_def` | Robot is playing defense |
| CLIMBING | `tele_climb` | Robot is climbing |
| ALLIANCE ZONE | `tele_alliance` | Robot is in the alliance zone |
| NEUTRAL ZONE | `tele_neutral` | Robot is in the neutral zone |
| OPPONENT ZONE | `tele_opponent` | Robot is in the opponent zone |

### Teleop Counters (Tap to Increment)

| Button | Code | What to Track |
|--------|------|---------------|
| Fuel Scored | `tele_fuel` | Each fuel piece scored (tap once per piece) |
| Fuel Fed | `tele_fed` | Each fuel piece fed to partner |

### Teleop Checkboxes

- **Alliance won auto?** — Check if your alliance won the autonomous period
- **Defended by opponent?** — Check if an opponent robot played defense on your team

## After the Match: Endgame

### Climb Level

| Option | Meaning |
|--------|---------|
| No Climb | Did not climb |
| L1 | Level 1 climb |
| L2 | Level 2 climb |
| L3 | Level 3 climb |
| Failed Climb | Attempted but failed |

### Climb Position

| Option | Meaning |
|--------|---------|
| No Climb | Did not climb |
| Output Side | Climbed on output side |
| Middle | Climbed in the middle |
| Depot Side | Climbed on depot side |

### Issue Checkboxes

- **Mech Issue** — Robot had a mechanical problem during the match
- **Died** — Robot stopped functioning entirely
- **Tipped** — Robot tipped over during the match

## After the Match: Ratings

### Scoring Effectiveness (0-5)

Rate how effectively the robot scored game pieces. Use the slider.

- **0** = Did not score at all
- **5** = Extremely effective scorer

### Scored How?

| Option | Meaning |
|--------|---------|
| While driving | Scored while in motion |
| While stationary | Scored from a fixed position |
| Both | Used both methods |
| No scoring | Did not score |

### Scoring Locations

Check all field zones where the robot scored (checkboxes, multiple allowed):

1. Outpost Trench
2. Outpost
3. Hub
4. Ladder
5. Depot
6. Depot Trench

### Feeding Skill (0-5)

Rate how effectively the robot passed/fed game pieces to alliance partners.

### Passed How?

Same options as "Scored How?" — driving, stationary, both, or no passing.

### Defense Skill (0-5)

Rate how effectively the robot played defense (0 = no defense played).

### Card

| Option | Meaning |
|--------|---------|
| No Card | No penalty cards received |
| Yellow | Yellow card issued |
| Red | Red card issued |

### Comments (Required)

Write observations about the robot's performance. These are read by the strategy team during alliance selection.

> [!TIP]
> Good comments mention specific things: "Fast cycle time but struggled with ground pickup" is more useful than "Good robot."

## Match Timer

- The timer appears as a sticky header showing elapsed time (MM:SS)
- Press **START** to begin, or it auto-starts on your first button press
- Press **STOP** to pause, then **START** to resume
- Press **RESET** to clear all data and start over

## How Timeline Data Works

Every button press creates a timeline entry stored in the format `code:type@time`:

- `code` — The action code (e.g., `auto_score`, `tele_def`)
- `type` — Either `start` (button pressed), `stop` (button released), or `point` (instant tap)
- `time` — Seconds elapsed since the timer started

**Example**: `auto_score:start@3;auto_score:stop@8;tele_fuel:point@45`

This means: scoring started at 3 seconds, stopped at 8 seconds (5-second scoring action), then a fuel point was scored at 45 seconds.

The timeline is submitted as a hidden form field and powers the Gantt chart visualizations on the dashboard.

## Tips

- **Hold buttons for the full duration** of the action, not just a tap
- If you miss something, the timer keeps running — just pick up where you left off
- Comments matter more than you think — the strategy team reads every one
- If the robot dies early, mark "Died" and note it in comments
- Don't worry about being perfect — some data is better than no data

---

See [Troubleshooting](troubleshooting.md) if the form isn't working properly.
