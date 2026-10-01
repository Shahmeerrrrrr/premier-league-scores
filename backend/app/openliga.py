import time
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple
import httpx
from fastapi import HTTPException

from app.schemas import (
    CurrentMatchdayResponse,
    Match,
    Team,
    Goal,
    TableRow,
)

BASE_URL = "https://api.openligadb.de"
LEAGUE_SHORTCUT = "PL"
SERVICE_UNAVAILABLE_MSG = "The soccer data service is unavailable right now. Try again in a minute."


class SimpleTtlCache:
    """In-memory cache keyed by full upstream URL with a 60-second TTL."""
    def __init__(self, ttl_seconds: float = 60.0):
        self.ttl = ttl_seconds
        self._cache: Dict[str, Tuple[float, Any]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            if key in self._cache:
                timestamp, data = self._cache[key]
                if time.time() - timestamp < self.ttl:
                    return data
                del self._cache[key]
            return None

    async def set(self, key: str, data: Any) -> None:
        async with self._lock:
            self._cache[key] = (time.time(), data)


class OpenLigaClient:
    def __init__(self):
        self.cache = SimpleTtlCache(ttl_seconds=60.0)
        self.http_client = httpx.AsyncClient(timeout=10.0)

    async def close(self):
        await self.http_client.aclose()

    async def fetch_upstream(self, url: str) -> Any:
        cached = await self.cache.get(url)
        if cached is not None:
            return cached

        try:
            response = await self.http_client.get(url)
            if response.status_code >= 400:
                raise HTTPException(status_code=502, detail=SERVICE_UNAVAILABLE_MSG)
            data = response.json()
        except (httpx.RequestError, httpx.TimeoutException, ValueError):
            raise HTTPException(status_code=502, detail=SERVICE_UNAVAILABLE_MSG)

        await self.cache.set(url, data)
        return data

    async def get_current_matchday(self) -> CurrentMatchdayResponse:
        url = f"{BASE_URL}/getcurrentgroup/{LEAGUE_SHORTCUT}"
        data = await self.fetch_upstream(url)

        if not isinstance(data, dict):
            raise HTTPException(status_code=502, detail=SERVICE_UNAVAILABLE_MSG)

        matchday = data.get("groupOrderID")
        label = data.get("groupName")

        if matchday is None or not isinstance(matchday, int):
            matchday = 1
        if not label:
            label = f"Matchday {matchday}"

        return CurrentMatchdayResponse(matchday=matchday, label=str(label))

    def _parse_kickoff(self, utc_str: Optional[str], local_str: Optional[str]) -> Optional[datetime]:
        if utc_str:
            try:
                clean_str = utc_str.replace("Z", "+00:00")
                return datetime.fromisoformat(clean_str)
            except Exception:
                pass
        if local_str:
            try:
                # Assume UTC if timezone not specified
                dt = datetime.fromisoformat(local_str)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt
            except Exception:
                pass
        return None

    def _derive_status(self, is_finished: bool, kickoff_dt: Optional[datetime]) -> str:
        if is_finished:
            return "finished"
        if kickoff_dt is not None:
            now_utc = datetime.now(timezone.utc)
            # Not finished + kickoff time already passed + within ~2 hours of kickoff -> LIVE
            if kickoff_dt <= now_utc <= kickoff_dt + timedelta(hours=2):
                return "live"
        return "upcoming"

    def _extract_scores(self, match: dict) -> Tuple[Optional[int], Optional[int]]:
        results = match.get("matchResults")
        if isinstance(results, list) and len(results) > 0:
            endergebnis = next(
                (r for r in results if isinstance(r, dict) and r.get("resultName") == "Endergebnis"),
                None,
            )
            selected = endergebnis if endergebnis is not None else results[-1]
            if isinstance(selected, dict):
                p1 = selected.get("pointsTeam1")
                p2 = selected.get("pointsTeam2")
                h_score = int(p1) if p1 is not None else None
                a_score = int(p2) if p2 is not None else None
                return h_score, a_score
        return None, None

    def _extract_goals(self, match: dict) -> List[Goal]:
        raw_goals = match.get("goals")
        if not isinstance(raw_goals, list):
            return []

        team1_id = (match.get("team1") or {}).get("teamId")
        team2_id = (match.get("team2") or {}).get("teamId")

        goals: List[Goal] = []
        prev_s1 = 0
        prev_s2 = 0

        for g in raw_goals:
            if not isinstance(g, dict):
                continue

            s1 = g.get("scoreTeam1") or 0
            s2 = g.get("scoreTeam2") or 0
            minute = g.get("matchMinute")
            scorer = (g.get("goalGetterName") or "").strip()
            is_penalty = bool(g.get("isPenalty", False))
            is_own_goal = bool(g.get("isOwnGoal", False))

            # Filter out non-goal placeholder entries (e.g. 0-0 before match start)
            if minute is None and not scorer and s1 == 0 and s2 == 0:
                continue

            scoring_team_id = g.get("scoringTeamId")
            if scoring_team_id is not None and team1_id is not None and scoring_team_id == team1_id:
                team = "home"
            elif scoring_team_id is not None and team2_id is not None and scoring_team_id == team2_id:
                team = "away"
            elif s1 > prev_s1:
                team = "home"
            else:
                team = "away"

            prev_s1 = max(prev_s1, s1)
            prev_s2 = max(prev_s2, s2)

            if not scorer:
                scorer = "Own Goal" if is_own_goal else "Goal"

            goals.append(
                Goal(
                    minute=minute if isinstance(minute, int) else None,
                    scorer=scorer,
                    team=team,
                    penalty=is_penalty,
                    ownGoal=is_own_goal,
                )
            )

        return goals

    async def get_matches(self, season: int, matchday: int) -> List[Match]:
        url = f"{BASE_URL}/getmatchdata/{LEAGUE_SHORTCUT}/{season}/{matchday}"
        data = await self.fetch_upstream(url)

        if not isinstance(data, list):
            raise HTTPException(status_code=502, detail=SERVICE_UNAVAILABLE_MSG)

        matches: List[Match] = []
        for m in data:
            if not isinstance(m, dict):
                continue

            match_id = m.get("matchID") or 0
            kickoff_utc_str = m.get("matchDateTimeUTC")
            kickoff_dt = self._parse_kickoff(kickoff_utc_str, m.get("matchDateTime"))
            is_finished = bool(m.get("matchIsFinished", False))

            status = self._derive_status(is_finished, kickoff_dt)
            home_score, away_score = self._extract_scores(m)
            goals = self._extract_goals(m)

            group = m.get("group") or {}
            m_day = group.get("groupOrderID") if isinstance(group.get("groupOrderID"), int) else matchday
            m_label = group.get("groupName") or f"Matchday {m_day}"

            t1 = m.get("team1") or {}
            t2 = m.get("team2") or {}

            home_team = Team(
                name=t1.get("teamName") or "Home Team",
                short=t1.get("shortName") or t1.get("teamName") or "Home",
                crest=t1.get("teamIconUrl") or "",
            )
            away_team = Team(
                name=t2.get("teamName") or "Away Team",
                short=t2.get("shortName") or t2.get("teamName") or "Away",
                crest=t2.get("teamIconUrl") or "",
            )

            # Standardize kickoffUtc string
            formatted_kickoff_utc = kickoff_dt.strftime("%Y-%m-%dT%H:%M:%SZ") if kickoff_dt else None

            matches.append(
                Match(
                    id=match_id,
                    kickoffUtc=formatted_kickoff_utc,
                    matchday=m_day,
                    matchdayLabel=m_label,
                    home=home_team,
                    away=away_team,
                    status=status,
                    homeScore=home_score,
                    awayScore=away_score,
                    goals=goals,
                )
            )

        return matches

    async def get_table(self, season: int) -> List[TableRow]:
        url = f"{BASE_URL}/getbltable/{LEAGUE_SHORTCUT}/{season}"
        data = await self.fetch_upstream(url)

        if not isinstance(data, list):
            raise HTTPException(status_code=502, detail=SERVICE_UNAVAILABLE_MSG)

        rows: List[TableRow] = []
        for index, row in enumerate(data):
            if not isinstance(row, dict):
                continue

            name = row.get("teamName") or "Unknown Team"
            short = row.get("shortName") or name
            crest = row.get("teamIconUrl") or ""

            rows.append(
                TableRow(
                    position=index + 1,
                    name=name,
                    short=short,
                    crest=crest,
                    played=int(row.get("matches") or 0),
                    won=int(row.get("won") or 0),
                    drawn=int(row.get("draw") or 0),
                    lost=int(row.get("lost") or 0),
                    goalsFor=int(row.get("goals") or 0),
                    goalsAgainst=int(row.get("opponentGoals") or 0),
                    goalDiff=int(row.get("goalDiff") or 0),
                    points=int(row.get("points") or 0),
                )
            )

        return rows
