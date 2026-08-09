"""Sensory-load scoring: match pedestrian sensors to a route and score it.

Rules (from the acceptance criteria):
- A sensor counts toward a route if it is within SENSOR_MATCH_RADIUS_M (50 m)
  of the path — checked once per sensor against the whole route, not
  per-point, so a sensor near several points on a winding route is never
  double-counted.
- The route's score is the average people/min across matched sensors that
  have a current reading.

location_id is treated as a string throughout, matching schema.sql's
TEXT PRIMARY KEY — never cast to int, since source sensor IDs are not
guaranteed to be purely numeric.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta

from . import config
from .geo import min_distance_to_polyline_m


def aggregate_readings(
    rows: list[dict], window_min: int = config.READING_WINDOW_MIN
) -> tuple[dict[str, float], datetime | None]:
    """Reduce per-minute feed rows to people/min per sensor.

    rows: dicts with location_id, sensing_datetime (ISO string or datetime),
    total_of_directions. Returns ({location_id: people_per_min}, latest_ts).
    The value is the mean of per-minute totals within the most recent
    window_min minutes of data actually present.
    """
    if not rows:
        return {}, None

    parsed: list[tuple[str, datetime, float]] = []
    for row in rows:
        ts = row["sensing_datetime"]
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts)
        parsed.append((str(row["location_id"]), ts, float(row["total_of_directions"] or 0)))

    latest = max(ts for _, ts, _ in parsed)
    cutoff = latest - timedelta(minutes=window_min)

    per_sensor: dict[str, list[float]] = defaultdict(list)
    for loc_id, ts, total in parsed:
        if ts >= cutoff:
            per_sensor[loc_id].append(total)

    return {loc: sum(v) / len(v) for loc, v in per_sensor.items()}, latest


def score_route(
    coords: list[tuple[float, float]],
    sensors: list[dict],
    readings: dict[str, float],
) -> dict:
    """Score one route geometry ((lon, lat) coords) against sensor readings.

    sensors: dicts with location_id, sensor_description, latitude, longitude.
    readings: people/min per location_id (only sensors currently reporting).
    """
    matched: list[dict] = []
    for sensor in sensors:
        lat, lon = sensor.get("latitude"), sensor.get("longitude")
        if lat is None or lon is None:
            continue
        distance = min_distance_to_polyline_m(float(lat), float(lon), coords)
        if distance <= config.SENSOR_MATCH_RADIUS_M:
            loc_id = str(sensor["location_id"])
            matched.append(
                {
                    "location_id": loc_id,
                    "name": sensor.get("sensor_description")
                    or sensor.get("sensor_name")
                    or f"Sensor {loc_id}",
                    "lat": float(lat),
                    "lon": float(lon),
                    "reading": readings.get(loc_id),
                }
            )

    with_reading = [s for s in matched if s["reading"] is not None]
    avg = (
        sum(s["reading"] for s in with_reading) / len(with_reading)
        if with_reading
        else None
    )

    return {
        "avg_density": round(avg, 1) if avg is not None else None,
        "matched_sensors": [
            {**s, "reading": round(s["reading"], 1) if s["reading"] is not None else None}
            for s in matched
        ],
    }
