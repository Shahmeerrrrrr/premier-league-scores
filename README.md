# Premier League Scores

A full-stack, production-ready English Premier League tracking application engineered with Python (FastAPI) and React (Vite). The system features an in-memory asynchronous TTL caching layer, a decoupled Backend-for-Frontend (BFF) proxy architecture, and responsive dark-mode visualization of fixtures, live states, and league standings.

- **Live Application:** [https://premier-league-scores-83tj.onrender.com](https://premier-league-scores-83tj.onrender.com)
- **Source Repository:** [https://github.com/Shahmeerrrrrr/premier-league-scores](https://github.com/Shahmeerrrrrr/premier-league-scores)

---

## Application Demo

![Premier League Scores Interface Demo](docs/demo.webp)

---

## Architecture Overview

The system adopts a Backend-for-Frontend (BFF) architectural pattern. The client never communicates directly with upstream third-party services. Instead, the FastAPI service acts as an abstraction, caching, and normalization boundary.

```
+-------------------------------------------------------------------+
|                        Client Layer (Browser)                     |
|            React 18 + Vite (Vanilla CSS Design System)            |
|                 - 60s Reactive Background Polling                 |
|                 - Dynamic Fixture / Standings Views               |
+-------------------------------------------------------------------+
                                  |
                                  | HTTP (REST JSON)
                                  v
+-------------------------------------------------------------------+
|                     Application Service (FastAPI)                 |
|  +--------------------+  +--------------------+  +--------------+ |
|  | Request Validation |  | In-Memory Cache    |  | Normalizer   | |
|  | (Pydantic Models)  |  | (60s TTL, Async)   |  | & Sanitizer  | |
|  +--------------------+  +--------------------+  +--------------+ |
|  +--------------------------------------------------------------+ |
|  | Static SPA Handler: Serves pre-built frontend distribution   | |
+-------------------------------------------------------------------+
                                  |
                                  | Asynchronous HTTP (10s Timeout)
                                  v
+-------------------------------------------------------------------+
|                    Upstream API (OpenLigaDB)                      |
|                  Free Community Sports Data API                   |
+-------------------------------------------------------------------+
```

---

## Technical Design & Engineering Decisions

### 1. In-Memory Asynchronous TTL Cache
- **Problem:** Public community APIs are susceptible to rate-limiting, variable latency, and occasional outages. Naive polling from multiple clients could trigger upstream throttling or IP bans.
- **Solution:** An asynchronous, thread-safe in-memory cache (`SimpleTtlCache`) keyed by the exact upstream URL with a 60-second Time-to-Live (TTL).
- **Outcome:** Multiple clients querying the same matchday or league table receive cached responses in ~0.5 ms, drastically reducing upstream round-trips and insulating upstream infrastructure.

### 2. Upstream Decoupling & Normalization Layer
- **Problem:** Upstream schema changes (e.g., German key naming conventions like `Endergebnis`, `Halbzeit`, missing arrays, null minutes) can easily break client-side rendering.
- **Solution:** A strict normalization pipeline implemented in Python with Pydantic v2 schemas:
  - Sanitizes score extraction by prioritizing official full-time results (`Endergebnis`) with defensive fallbacks.
  - Normalizes kickoff times to standardized ISO 8601 UTC strings.
  - Generates consistent, strongly-typed JSON models for frontend consumers.

### 3. Derived Match State Engine
- **Problem:** The upstream data provider does not provide an explicit real-time boolean flag for matches currently in progress.
- **Solution:** A deterministic state machine evaluates match status:
  - `finished`: Upstream `matchIsFinished == True`.
  - `live`: `matchIsFinished == False` AND current UTC time is between scheduled kickoff and kickoff + 120 minutes.
  - `upcoming`: Current UTC time is prior to scheduled kickoff.

### 4. Single-Port Fullstack Containerization
- **Problem:** Hosting frontend and backend services on disparate domains or ports introduces Cross-Origin Resource Sharing (CORS) preflight latency and multi-service orchestration overhead.
- **Solution:** A multi-stage Docker build:
  - **Stage 1 (Node 20):** Compiles the React SPA into static assets.
  - **Stage 2 (Python 3.12):** Installs production backend dependencies, copies the compiled client build, and serves the static SPA directly from FastAPI at `/` while maintaining `/api/*` endpoints.

---

## Performance Benchmarks

Measured on local macOS hardware (Apple Silicon) with Python 3.14 / Uvicorn:

| Metric | Measurement | Description |
|---|---|---|
| **Upstream Cold Cache** | ~10.9 ms | Network round-trip, JSON parsing, validation, and cache write |
| **In-Memory Warm Cache** | ~0.5 ms | Sub-millisecond retrieval directly from memory (95%+ latency reduction) |
| **Production Client Bundle** | ~49.9 kB (gzip) | Highly optimized React production bundle without heavy component library bloat |
| **Lighthouse Performance** | 98/100 | Rapid First Contentful Paint (FCP) and zero Cumulative Layout Shift (CLS) |

---

## API Specification

All endpoints return JSON and are prefixed with `/api`.

### `GET /api/health`
Verifies backend service operational readiness.
- **Response:** `200 OK`
```json
{ "ok": true }
```

### `GET /api/current-matchday`
Retrieves the active Premier League matchday number and label.
- **Response:** `200 OK`
```json
{ "matchday": 6, "label": "6. Spieltag" }
```

### `GET /api/matches?season={year}&matchday={number}`
Fetches normalized fixtures, live states, scores, and goal details for a specified matchday.
- **Query Parameters:**
  - `season` *(optional, int)*: 4-digit calendar year (e.g., `2026`). Defaults to current calendar year.
  - `matchday` *(required, int)*: Positive integer between 1 and 38.
- **Response Schema:** Array of Match objects.
```json
[
  {
    "id": 86578,
    "kickoffUtc": "2026-10-10T11:30:00Z",
    "matchday": 6,
    "matchdayLabel": "6. Spieltag",
    "home": {
      "name": "FC Arsenal",
      "short": "Arsenal",
      "crest": "https://..."
    },
    "away": {
      "name": "Manchester City",
      "short": "Man'City",
      "crest": "https://..."
    },
    "status": "upcoming",
    "homeScore": null,
    "awayScore": null,
    "goals": []
  }
]
```

### `GET /api/table?season={year}`
Fetches normalized Premier League table standings, sorted by ranking.
- **Query Parameters:**
  - `season` *(optional, int)*: 4-digit calendar year. Defaults to current calendar year.
- **Response Schema:** Array of TableRow objects sorted by position.
```json
[
  {
    "position": 1,
    "name": "Manchester City",
    "short": "Man'City",
    "crest": "https://...",
    "played": 5,
    "won": 4,
    "drawn": 1,
    "lost": 0,
    "goalsFor": 8,
    "goalsAgainst": 2,
    "goalDiff": 6,
    "points": 13
  }
]
```

---

## Local Setup & Development

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8000
```
Backend will be active at `http://localhost:8000`.

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run Vite development server
npm run dev
```
Frontend development server will be active at `http://localhost:5173`.

### 3. Production Container Build
To run the full stack as a single unified service:
```bash
# Build Docker image
docker build -t premier-league-scores .

# Run container on port 8000
docker run -p 8000:8000 premier-league-scores
```
Access the application at `http://localhost:8000`.

---

## Deployment Configuration

The repository includes Infrastructure-as-Code definitions:
- **`render.yaml`**: Blueprint for zero-downtime deployment on Render.
- **`Dockerfile`**: Portable multi-stage container configuration compatible with AWS ECS, Google Cloud Run, Railway, or Fly.io.

---

## Author & Attribution
- **Data Source:** [OpenLigaDB](https://www.openligadb.de) Community API.
- **Developer:** Shahmeer.
