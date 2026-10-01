from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import (
    HealthResponse,
    CurrentMatchdayResponse,
    Match,
    TableRow,
)
from app.openliga import OpenLigaClient

client = OpenLigaClient()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await client.close()


app = FastAPI(title="Premier League Scores API", lifespan=lifespan)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_default_season() -> int:
    return datetime.now(timezone.utc).year


def validate_season(season: Optional[int]) -> int:
    if season is None:
        return get_default_season()
    if not (1900 <= season <= 2100):
        raise HTTPException(
            status_code=400,
            detail="Invalid season year. Please provide a 4-digit year.",
        )
    return season


def validate_matchday(matchday: int) -> int:
    if matchday < 1 or matchday > 50:
        raise HTTPException(
            status_code=400,
            detail="Invalid matchday. Matchday must be a positive number.",
        )
    return matchday


@app.get("/api/health", response_model=HealthResponse)
async def health():
    return HealthResponse(ok=True)


@app.get("/api/current-matchday", response_model=CurrentMatchdayResponse)
async def current_matchday():
    return await client.get_current_matchday()


@app.get("/api/matches", response_model=List[Match])
async def get_matches(
    season: Optional[int] = Query(None, description="4-digit season year (e.g. 2026)"),
    matchday: int = Query(..., description="Matchday number (e.g. 6)"),
):
    validated_season = validate_season(season)
    validated_matchday = validate_matchday(matchday)
    return await client.get_matches(validated_season, validated_matchday)


@app.get("/api/table", response_model=List[TableRow])
async def get_table(
    season: Optional[int] = Query(None, description="4-digit season year (e.g. 2026)"),
):
    validated_season = validate_season(season)
    return await client.get_table(validated_season)


# Mount built frontend in production if dist directory exists
from pathlib import Path
from fastapi.staticfiles import StaticFiles

dist_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="frontend")

