# AI_IDE_PROMPT.md — Premier League Scores (Project #2)

> **Paste this entire file into your AI IDE (Antigravity) as the task prompt.**
> It scaffolds a complete, working Premier League scores app from zero to running.
> Everything is 100% free: no API keys, no signup, no paid services.

---

## 1. What to build

**Premier League Scores** — a dark-themed hub for the English Premier League:

1. **Matches view** (default): fixtures and results for a matchday, with a
   previous/next matchday navigator. Finished matches show scores; upcoming
   matches show kickoff time in the user's local timezone; matches currently
   being played show a pulsing LIVE badge. Auto-refreshes every 60 seconds.
2. **Table view**: the league standings — position, team crest + name, played,
   won, drawn, lost, goals for/against, goal difference, points. Color zones:
   top 4 (Champions League), 5th (Europa League), bottom 3 (relegation),
   with a legend explaining the colors.
3. **Match details**: clicking a finished match expands it to show the goals
   (minute, scorer, which team, penalty/own-goal markers) when the data has them.

Design: dark theme only — near-black background (`#0a0a0b`-ish), no white screens,
no light mode. Clean, readable, mobile-friendly. Team crests come from the API;
when a crest URL is missing or broken, render a fallback badge with the team's
initials. (Note: some crest URLs are `data:` URIs or plain `http://` — both
render fine in `<img>` tags; still keep the fallback.)

## 2. Data source — OpenLigaDB (verified live 2026-09-30)

Base URL: `https://api.openligadb.de` — free, no key, no signup, returns JSON.
Be respectful: cache aggressively, never poll faster than 60 seconds.

The Premier League shortcut is `PL`. Verified live on 2026-09-30:

- `GET /getcurrentgroup/PL` → `{"groupName": "6. Spieltag", "groupOrderID": 6, ...}`
  (the current matchday; `groupOrderID` is the matchday number — was 6 on 2026-09-30)
- `GET /getmatchdata/PL/2026/{matchday}` → array of matches:
  ```json
  {
    "matchID": 83192,
    "matchDateTime": "2026-10-09T20:30:00",
    "matchDateTimeUTC": "2026-10-09T18:30:00Z",
    "group": { "groupName": "6. Spieltag", "groupOrderID": 6 },
    "team1": { "teamId": 2617, "teamName": "FC Arsenal", "shortName": "Arsenal", "teamIconUrl": "https://..." },
    "team2": { "teamId": 4244, "teamName": "Manchester City", "shortName": "Man'City", "teamIconUrl": "https://..." },
    "matchIsFinished": false,
    "matchResults": [],
    "goals": []
  }
  ```
  For finished matches, `matchResults` contains entries like
  `{"resultName": "Endergebnis", "pointsTeam1": 2, "pointsTeam2": 1}`
  ("Endergebnis" = final score; there may also be "Halbzeit" = halftime).
  `goals` entries look like
  `{"matchMinute": 67, "goalGetterName": "...", "scoreTeam1": 1, "scoreTeam2": 0, "isPenalty": false, "isOwnGoal": false}`.
  Handle empty/missing arrays defensively — never crash on them.
- `GET /getbltable/PL/2026` → array of standings rows (verified: 2026 season,
  Arsenal 2nd on 12 points after 4 games):
  ```json
  { "teamInfoId": 2617, "teamName": "FC Arsenal", "shortName": "Arsenal",
    "teamIconUrl": "https://...", "points": 12, "opponentGoals": 1, "goals": 8,
    "matches": 4, "won": 4, "lost": 0, "draw": 0, "goalDiff": 7 }
  ```
  (already sorted by position; index + 1 = league position)

Season convention: the season starting in a calendar year uses that year
(e.g. the 2026/27 season → season `2026`). Default the season to the current
calendar year, computed at runtime — never hardcode it.

Known API honesty notes (surface these in the UI/README, don't hide them):

- The API has no explicit "live" flag. Derive it: not finished + kickoff time
  already passed + within ~2 hours of kickoff → treat as LIVE.
- Some crest URLs or goal details may be missing — always have fallbacks.

## 3. Architecture

```
React 18 + Vite (dark UI)  →  FastAPI backend  →  OpenLigaDB (api.openligadb.de)
                                    ↳ in-memory TTL cache (60s per upstream URL)
```

The frontend NEVER calls OpenLigaDB directly — it calls our backend, which
proxies, caches, and normalizes the data into clean shapes. This keeps the
frontend decoupled from the upstream API's field names.

### 3.1 Backend (`backend/`, Python 3.11+, FastAPI)

`requirements.txt`: `fastapi`, `uvicorn[standard]`, `pydantic>=2`, `httpx`.

Endpoints (all JSON, all `GET`):

| Endpoint | Purpose |
|---|---|
| `/api/health` | `{"ok": true}` |
| `/api/current-matchday` | `{"matchday": 6, "label": "6. Spieltag"}` from `/getcurrentgroup/PL` |
| `/api/matches?season=2026&matchday=6` | Normalized matches (see schema below) |
| `/api/table?season=2026` | Normalized standings (see schema below) |

(`season` defaults to the current calendar year when omitted.)

Normalized match object the backend returns:

```json
{
  "id": 83192,
  "kickoffUtc": "2026-10-09T18:30:00Z",
  "matchday": 6, "matchdayLabel": "6. Spieltag",
  "home": { "name": "FC Arsenal", "short": "Arsenal", "crest": "https://..." },
  "away": { "name": "Manchester City", "short": "Man'City", "crest": "https://..." },
  "status": "upcoming" | "live" | "finished",
  "homeScore": 2 | null, "awayScore": 1 | null,
  "goals": [ { "minute": 67, "scorer": "...", "team": "home"|"away", "penalty": false, "ownGoal": false } ]
}
```

Normalized table row:

```json
{ "position": 1, "name": "FC Arsenal", "short": "Arsenal", "crest": "https://...",
  "played": 4, "won": 4, "drawn": 0, "lost": 0,
  "goalsFor": 8, "goalsAgainst": 1, "goalDiff": 7, "points": 12 }
```

Backend rules:

- In-memory cache: key = full upstream URL, TTL = 60 seconds. Serve from cache
  when fresh; this is what makes the 60s frontend polling cheap and polite.
- Upstream failures (timeout, 5xx, bad JSON) → return HTTP 502 with a plain-English
  `detail` like "The soccer data service is unavailable right now. Try again in a minute."
  Never leak tracebacks or upstream internals.
- Timeouts: 10s on every upstream call via `httpx`.
- CORS: allow `http://localhost:5173` and `http://127.0.0.1:5173`.
- Query params validated: `season` a 4-digit year, `matchday` a positive int.
  Bad values → 400 with a plain message.
- Score extraction: prefer the `matchResults` entry with `resultName == "Endergebnis"`;
  fall back to the last entry; if none, scores are `null`.
- Status derivation: `matchIsFinished` → `"finished"`; else if kickoff passed and
  within 2h → `"live"`; else `"upcoming"`.

### 3.2 Frontend (`frontend/`, React 18 + Vite)

- No UI framework required — clean hand-written CSS is fine, or Tailwind if the
  IDE prefers. Dark theme only (`#0a0a0b` background, light text). No white screens.
- Files: `src/api.js` (all backend calls in one place), `src/App.jsx` (routing via
  simple view state: `"matches" | "table"`), components like `MatchCard`,
  `StandingsTable`, `MatchdayNav`.
- Matches view: on load, fetch `/api/current-matchday`, then matches for it.
  Prev/next buttons change matchday and refetch. Poll matches every 60s
  (only while the matches view is active; clean up the interval).
- Kickoff times: parse `kickoffUtc`, display in the user's local timezone
  (e.g. "Fri, Oct 9 · 2:30 PM").
- Finished match rows expand on click to show the goal list; show
  "Goal details not available for this match." when the list is empty.
- Table view: zones with a legend — 1–4 Champions League (green tint),
  5th Europa League (blue tint), bottom 3 relegation (red tint).
- States everywhere: loading skeletons/spinners, empty states ("No matches scheduled
  for this matchday."), and error states with a retry button — all in plain English.

## 4. Project layout

```
SOCCER/
├── AI_IDE_PROMPT.md        (this file)
├── README.md               (write it — see section 6)
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py         (FastAPI app, endpoints)
│       ├── schemas.py      (Pydantic response models)
│       └── openliga.py     (upstream client + 60s TTL cache + normalization)
└── frontend/
    ├── package.json        (react, react-dom, vite)
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js
        ├── components/
        └── styles.css
```

## 5. Constraints (non-negotiable)

- 100% free. No API keys, no signup, no paid services, no cloud calls except the
  free OpenLigaDB API.
- Never poll the upstream API faster than every 60 seconds (the cache enforces this).
- Dark UI only — the user dislikes bright white backgrounds.
- Plain-English UI copy and code comments. No hype words, no invented stats.
- Normal, descriptive naming everywhere — no cutesy app names or corny copy.
- Defensive parsing: the upstream API can return empty arrays or null fields —
  the app must never crash on them.

## 6. README.md (the IDE must write this)

- What Premier League Scores is, in one plain-English paragraph.
- Data source credit: OpenLigaDB (free, no key), with a link.
- Setup: backend venv + `pip install -r requirements.txt` +
  `uvicorn app.main:app --reload --port 8000`; frontend `npm install` + `npm run dev`.
- Architecture diagram (the ASCII one from section 3).
- Honest limitations section: live status is derived, not official; scores depend
  on upstream data freshness.
- No performance claims unless actually measured.

## 7. Verification checklist (run before calling it done)

1. `python3 -m py_compile` on every backend file — zero errors.
2. `pip install -r requirements.txt` succeeds; start backend on :8000.
3. `curl localhost:8000/api/health` → `{"ok": true}`.
4. `curl localhost:8000/api/current-matchday` → sensible matchday JSON.
5. `curl "localhost:8000/api/matches?season=2026&matchday=6"` → 10 matches
   with home/away names and statuses.
6. `curl "localhost:8000/api/table?season=2026"` → 20 rows, position 1 has
   the most points.
7. Frontend `npm install && npm run dev` → app loads at :5173 with no console errors;
   matches view, table view, and matchday nav all work; kickoff times show in
   local timezone.
8. Throttle test: load the matches view and confirm the backend only hits the
   upstream API about once per minute (cache working).

## 8. What NOT to do

- Do not add API keys, auth, Docker, databases, or paid dependencies.
- Do not hardcode the season or matchday — compute them at runtime.
- Do not invent match data, scores, or standings — everything comes from the API.
- Do not build a light theme.
- Do not use corny names or marketing-speak anywhere in the app or README.
