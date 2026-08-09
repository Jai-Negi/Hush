"""Environment configuration. All secrets come from environment variables / .env."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# --- User-supplied (see backend/.env.example) ---
DATABASE_URL: str | None = os.environ.get("DATABASE_URL") or None
ORS_API_KEY: str | None = os.environ.get("ORS_API_KEY") or None

# Comma-separated list of allowed frontend origins; "*" allows all (fine for a
# public read-only API, tighten to your deployed frontend URL if you prefer).
CORS_ORIGINS: list[str] = [
    o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()
]

ORS_BASE_URL = os.environ.get("ORS_BASE_URL", "https://api.openrouteservice.org")
