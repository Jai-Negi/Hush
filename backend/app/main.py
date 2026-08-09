"""Hush API - sensory-aware wayfinding for Melbourne CBD.

Endpoints:
  GET  /health       liveness (used by the keep-alive ping)
  POST /api/routes   walking routes (no sensory scoring yet — added in a later commit)
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import config, ors

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Hush API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Point(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    label: str | None = None


class RouteRequest(BaseModel):
    from_: Point = Field(alias="from")
    to: Point

    model_config = {"populate_by_name": True}


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/api/routes")
def plan_routes(req: RouteRequest):
    origin, dest = req.from_, req.to
    try:
        raw_routes, route_source = ors.get_routes(
            origin.lat, origin.lon, dest.lat, dest.lon
        )
    except ors.RouteServiceError:
        raise HTTPException(
            status_code=503,
            detail="The route service is not available right now. Try again in a minute.",
        )

    routes = [
        {
            "id": i,
            "via": r["via"],
            "duration_min": round(r["duration_s"] / 60),
            "distance_m": round(r["distance_m"]),
            "geometry": {
                "type": "LineString",
                "coordinates": [[lon, lat] for lon, lat in r["coordinates"]],
            },
        }
        for i, r in enumerate(raw_routes)
    ]
    routes.sort(key=lambda r: r["duration_min"])

    return {"routes": routes, "route_source": route_source}
