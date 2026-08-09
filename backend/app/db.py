"""Optional Postgres access. If DATABASE_URL is unset or the database is
unreachable, every function returns None and callers fall back (live ORS
geocode, then the curated places list). The app must never crash because of
the DB."""

from __future__ import annotations

import logging

import psycopg
from psycopg.rows import dict_row

from . import config

log = logging.getLogger(__name__)


def _connect() -> psycopg.Connection | None:
    if not config.DATABASE_URL:
        return None
    try:
        return psycopg.connect(config.DATABASE_URL, row_factory=dict_row, connect_timeout=10)
    except Exception as exc:  # noqa: BLE001
        log.warning("database unavailable: %s", exc)
        return None


def search_landmarks(text: str, limit: int = 5) -> list[dict] | None:
    """Case-insensitive substring match over landmark.feature_name, or None
    if the DB is unusable/has no match (caller falls back to live geocoding).

    Requires the landmark table from us/1.1 schema. Until that exists, this
    returns None and geocode falls through to ORS / curated places.
    """
    conn = _connect()
    if conn is None:
        return None
    try:
        with conn:
            rows = conn.execute(
                """
                SELECT feature_name, latitude, longitude
                FROM landmark
                WHERE feature_name ILIKE %s
                ORDER BY feature_name
                LIMIT %s
                """,
                (f"%{text}%", limit),
            ).fetchall()
        return rows or None
    except Exception as exc:  # noqa: BLE001
        log.warning("landmark search failed: %s", exc)
        return None
    finally:
        conn.close()
