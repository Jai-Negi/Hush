import json

from app import ors

SAMPLE_GEOJSON = {
    "features": [
        {
            "properties": {
                "summary": {"duration": 720, "distance": 950},
                "segments": [
                    {
                        "steps": [
                            {"name": "Bourke Street Mall", "distance": 600},
                            {"name": "-", "distance": 50},
                            {"name": "Elizabeth Street", "distance": 300},
                        ]
                    }
                ],
            },
            "geometry": {
                "coordinates": [
                    [144.9628, -37.8100, 0],
                    [144.9655, -37.8167, 0],
                ]
            },
        }
    ]
}


def test_parse_geojson_picks_dominant_street():
    routes = ors._parse_geojson(SAMPLE_GEOJSON)
    assert len(routes) == 1
    r = routes[0]
    assert r["via"] == "Bourke Street Mall"
    assert r["duration_s"] == 720
    assert r["distance_m"] == 950
    assert r["coordinates"] == [(144.9628, -37.8100), (144.9655, -37.8167)]


def test_parse_geojson_handles_no_named_steps():
    doc = {
        "features": [
            {
                "properties": {"summary": {"duration": 100, "distance": 50}, "segments": []},
                "geometry": {"coordinates": [[144.96, -37.81, 0], [144.97, -37.82, 0]]},
            }
        ]
    }
    routes = ors._parse_geojson(doc)
    assert routes[0]["via"] is None


def test_fallback_matches_nearby_request(tmp_path, monkeypatch):
    fallback_file = tmp_path / "ors_fallback_routes.json"
    fallback_file.write_text(
        json.dumps(
            {
                "from": {"lat": -37.8100, "lon": 144.9628},
                "to": {"lat": -37.8167, "lon": 144.9655},
                "response": SAMPLE_GEOJSON,
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(ors, "FALLBACK_FILE", fallback_file)

    result = ors._try_fallback(-37.8102, 144.9630, -37.8168, 144.9656)
    assert result is not None
    assert result[0]["via"] == "Bourke Street Mall"


def test_fallback_rejects_far_request(tmp_path, monkeypatch):
    fallback_file = tmp_path / "ors_fallback_routes.json"
    fallback_file.write_text(
        json.dumps(
            {
                "from": {"lat": -37.8100, "lon": 144.9628},
                "to": {"lat": -37.8167, "lon": 144.9655},
                "response": SAMPLE_GEOJSON,
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(ors, "FALLBACK_FILE", fallback_file)

    result = ors._try_fallback(-37.90, 145.05, -37.90, 145.05)
    assert result is None


def test_fallback_missing_file_returns_none(tmp_path, monkeypatch):
    monkeypatch.setattr(ors, "FALLBACK_FILE", tmp_path / "does_not_exist.json")
    assert ors._try_fallback(-37.81, 144.96, -37.81, 144.96) is None
