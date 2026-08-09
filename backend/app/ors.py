"""OpenRouteService client: walking routes with alternatives.

Route responses are cached in memory per origin/destination pair. If ORS
fails and nothing is cached yet, a RouteServiceError is raised and the API
returns a plain-language error — we never fabricate route geometry.
"""

from __future__ import annotations

import logging
import time

import httpx

from . import config

log = logging.getLogger(__name__)


class RouteServiceError(Exception):
    """Raised when no route source (live or cache) can answer."""


_route_cache: dict[tuple, dict] = {}


def _cache_key(from_lat, from_lon, to_lat, to_lon) -> tuple:
    return (round(from_lat, 4), round(from_lon, 4), round(to_lat, 4), round(to_lon, 4))


def _parse_geojson(feature_collection: dict) -> list[dict]:
    routes = []
    for feature in feature_collection.get("features", []):
        props = feature.get("properties", {})
        summary = props.get("summary", {})
        # Dominant street name = the named step covering the most distance.
        street_dist: dict[str, float] = {}
        for segment in props.get("segments", []):
            for step in segment.get("steps", []):
                name = (step.get("name") or "").strip()
                if name and name != "-":
                    street_dist[name] = street_dist.get(name, 0.0) + float(
                        step.get("distance") or 0
                    )
        via = max(street_dist, key=street_dist.get) if street_dist else None
        routes.append(
            {
                "via": via,
                "duration_s": float(summary.get("duration") or 0),
                "distance_m": float(summary.get("distance") or 0),
                "coordinates": [
                    (float(lon), float(lat))
                    for lon, lat, *_ in feature["geometry"]["coordinates"]
                ],
            }
        )
    return routes


def fetch_routes_raw(from_lat, from_lon, to_lat, to_lon) -> dict:
    """One live ORS call returning the raw GeoJSON FeatureCollection."""
    if not config.ORS_API_KEY:
        raise RouteServiceError("no ORS API key configured")
    resp = httpx.post(
        f"{config.ORS_BASE_URL}/v2/directions/foot-walking/geojson",
        headers={"Authorization": config.ORS_API_KEY},
        json={
            "coordinates": [[from_lon, from_lat], [to_lon, to_lat]],
            "alternative_routes": {
                "target_count": 3,
                "share_factor": 0.6,
                "weight_factor": 1.6,
            },
            "instructions": True,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def get_routes(from_lat, from_lon, to_lat, to_lon) -> tuple[list[dict], str]:
    """Returns (routes, route_source) where route_source is live|cache."""
    key = _cache_key(from_lat, from_lon, to_lat, to_lon)
    cached = _route_cache.get(key)
    if cached and time.monotonic() - cached["at"] < config.ROUTE_CACHE_TTL_S:
        return cached["routes"], "cache"

    try:
        routes = _parse_geojson(fetch_routes_raw(from_lat, from_lon, to_lat, to_lon))
        if routes:
            _route_cache[key] = {"at": time.monotonic(), "routes": routes}
            return routes, "live"
    except Exception as exc:  # noqa: BLE001
        log.warning("ORS request failed: %s", exc)

    if cached:  # expired cache beats nothing
        return cached["routes"], "cache"

    raise RouteServiceError("route service unavailable")
