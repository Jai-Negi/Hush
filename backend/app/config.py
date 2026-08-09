"""Environment configuration. All secrets come from environment variables / .env."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

CORS_ORIGINS: list[str] = [
    o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()
]

# --- User-supplied (see backend/.env.example) ---
ORS_API_KEY: str | None = os.environ.get("ORS_API_KEY") or None
DATABASE_URL: str | None = os.environ.get("DATABASE_URL") or None

# --- Data sources ---
ORS_BASE_URL = os.environ.get("ORS_BASE_URL", "https://api.openrouteservice.org")

# --- Behaviour tuning ---
ROUTE_CACHE_TTL_S = 600  # in-memory cache of ORS responses per origin/destination
SENSOR_MATCH_RADIUS_M = 50.0  # AC 1.1.2: sensors within 50 m of the path
READING_WINDOW_MIN = 20  # people/min averaged over the most recent N minutes

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
