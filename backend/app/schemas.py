from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    ok: bool = True


class CurrentMatchdayResponse(BaseModel):
    matchday: int
    label: str


class Team(BaseModel):
    name: str
    short: str
    crest: str


class Goal(BaseModel):
    minute: Optional[int] = None
    scorer: str
    team: Literal["home", "away"]
    penalty: bool
    ownGoal: bool


class Match(BaseModel):
    id: int
    kickoffUtc: Optional[str] = None
    matchday: int
    matchdayLabel: str
    home: Team
    away: Team
    status: Literal["upcoming", "live", "finished"]
    homeScore: Optional[int] = None
    awayScore: Optional[int] = None
    goals: List[Goal] = Field(default_factory=list)


class TableRow(BaseModel):
    position: int
    name: str
    short: str
    crest: str
    played: int
    won: int
    drawn: int
    lost: int
    goalsFor: int
    goalsAgainst: int
    goalDiff: int
    points: int
