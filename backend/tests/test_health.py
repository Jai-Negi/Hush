from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}


def test_geocode_curated_fallback_without_key():
    """AC1.2.1: without ORS key / DB hits, curated CBD places still answer search."""
    body = client.get("/api/geocode", params={"text": "flinders"}).json()
    labels = [r["label"] for r in body["results"]]
    assert any("Flinders" in label for label in labels)


def test_geocode_requires_min_length():
    resp = client.get("/api/geocode", params={"text": "a"})
    assert resp.status_code == 422
