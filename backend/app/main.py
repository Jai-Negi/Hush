"""Hush API — sensory-aware wayfinding for Melbourne CBD.

Endpoints:
  GET  /health            liveness (used by the keep-alive ping)
  GET  /api/geocode       place search (database first, ORS Pelias, curated fallback)
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from . import config, db, ors

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Hush API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/api/geocode")
def geocode(text: str = Query(min_length=2, max_length=100)):
    # DB first — never call ORS when landmarks already answer the query.
    db_hits = db.search_landmarks(text)
    if db_hits:
        return {
            "results": [
                {
                    "label": r["feature_name"],
                    "lat": float(r["latitude"]),
                    "lon": float(r["longitude"]),
                }
                for r in db_hits
            ]
        }
    return {"results": ors.geocode(text)}
