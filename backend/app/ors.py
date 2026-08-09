"""OpenRouteService client — geocoding for AC1.2.1.

Routing (get_routes) lands with us/1.1. Geocode falls through to the curated
places list when the ORS key is missing or the request fails.
"""

from __future__ import annotations

import logging

import httpx

from . import config, places

log = logging.getLogger(__name__)


def geocode(text: str, limit: int = 5) -> list[dict]:
    """ORS/Pelias geocoding scoped to central Melbourne; curated list otherwise."""
    if config.ORS_API_KEY:
        try:
            resp = httpx.get(
                f"{config.ORS_BASE_URL}/geocode/search",
                params={
                    "api_key": config.ORS_API_KEY,
                    "text": text,
                    "size": limit,
                    # Bounding box around greater central Melbourne
                    "boundary.rect.min_lon": 144.90,
                    "boundary.rect.min_lat": -37.86,
                    "boundary.rect.max_lon": 145.02,
                    "boundary.rect.max_lat": -37.77,
                },
                timeout=15,
            )
            resp.raise_for_status()
            features = resp.json().get("features", [])
            results = [
                {
                    "label": f["properties"].get("label", text),
                    "lat": f["geometry"]["coordinates"][1],
                    "lon": f["geometry"]["coordinates"][0],
                }
                for f in features
            ]
            if results:
                return results
        except Exception as exc:  # noqa: BLE001
            log.warning("geocode failed, using curated places: %s", exc)
    return places.search(text, limit)
