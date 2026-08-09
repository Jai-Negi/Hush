from datetime import datetime, timedelta, timezone

from app.scoring import aggregate_readings, score_route

NOW = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)


def test_aggregate_readings_averages_within_window():
    rows = [
        {"location_id": "1", "sensing_datetime": NOW.isoformat(), "total_of_directions": 100},
        {
            "location_id": "1",
            "sensing_datetime": (NOW - timedelta(minutes=5)).isoformat(),
            "total_of_directions": 80,
        },
        {
            "location_id": "1",
            "sensing_datetime": (NOW - timedelta(minutes=40)).isoformat(),
            "total_of_directions": 10_000,  # outside the window, must be ignored
        },
    ]
    readings, latest = aggregate_readings(rows, window_min=20)
    assert latest == NOW
    assert readings["1"] == 90.0  # mean of 100 and 80 only


def test_aggregate_readings_empty():
    readings, latest = aggregate_readings([])
    assert readings == {}
    assert latest is None


def test_score_route_matches_sensor_within_radius():
    coords = [(144.9600, -37.8100), (144.9620, -37.8100)]
    sensors = [
        {
            "location_id": "1",
            "sensor_description": "Test Sensor",
            "latitude": -37.8100,
            "longitude": 144.9610,
        },
        {
            "location_id": "2",
            "sensor_description": "Far Sensor",
            "latitude": -37.9000,
            "longitude": 145.1000,
        },
    ]
    readings = {"1": 42.0, "2": 999.0}

    result = score_route(coords, sensors, readings)

    matched_ids = {s["location_id"] for s in result["matched_sensors"]}
    assert matched_ids == {"1"}
    assert result["avg_density"] == 42.0


def test_score_route_no_matched_sensors():
    coords = [(144.9600, -37.8100), (144.9620, -37.8100)]
    sensors = [
        {
            "location_id": "1",
            "sensor_description": "Far Sensor",
            "latitude": -37.9000,
            "longitude": 145.1000,
        },
    ]
    result = score_route(coords, sensors, {})
    assert result["matched_sensors"] == []
    assert result["avg_density"] is None
