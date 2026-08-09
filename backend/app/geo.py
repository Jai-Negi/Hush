"""Distance helpers. The CBD is ~2 km across, so an equirectangular projection
around the area's latitude is accurate to well under a metre for our purposes."""

from __future__ import annotations

import math

EARTH_RADIUS_M = 6_371_000.0


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = phi2 - phi1
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def _project(lat: float, lon: float, ref_lat: float) -> tuple[float, float]:
    x = math.radians(lon) * EARTH_RADIUS_M * math.cos(math.radians(ref_lat))
    y = math.radians(lat) * EARTH_RADIUS_M
    return x, y


def point_to_segment_m(
    lat: float, lon: float, lat_a: float, lon_a: float, lat_b: float, lon_b: float
) -> float:
    """Shortest distance from a point to the segment A-B, in metres."""
    ref = (lat_a + lat_b) / 2
    px, py = _project(lat, lon, ref)
    ax, ay = _project(lat_a, lon_a, ref)
    bx, by = _project(lat_b, lon_b, ref)
    abx, aby = bx - ax, by - ay
    ab_len_sq = abx * abx + aby * aby
    if ab_len_sq == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * abx + (py - ay) * aby) / ab_len_sq))
    cx, cy = ax + t * abx, ay + t * aby
    return math.hypot(px - cx, py - cy)


def min_distance_to_polyline_m(
    lat: float, lon: float, coords: list[tuple[float, float]]
) -> float:
    """Shortest distance from a point to any edge of a (lon, lat) polyline."""
    best = float("inf")
    for (lon1, lat1), (lon2, lat2) in zip(coords, coords[1:]):
        d = point_to_segment_m(lat, lon, lat1, lon1, lat2, lon2)
        if d < best:
            best = d
    return best
