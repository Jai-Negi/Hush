"""Download City of Melbourne open datasets into backend/data/ as fixtures.

Run from repo root:  python backend/scripts/fetch_fixtures.py
Uses only the standard library so it runs before any dependencies are installed.
"""

from __future__ import annotations

import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

PORTAL = "https://data.melbourne.vic.gov.au/api/explore/v2.1"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

SENSOR_LOCATIONS_DATASET = "pedestrian-counting-system-sensor-locations"


def fetch_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "hush-fixture-fetch"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def export_dataset(dataset_id: str):
    url = f"{PORTAL}/catalog/datasets/{dataset_id}/exports/json"
    return fetch_json(url)


def save(name: str, records) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out = DATA_DIR / f"{name}.json"
    doc = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "records": records,
    }
    out.write_text(json.dumps(doc, indent=1), encoding="utf-8")
    print(f"wrote {out} ({len(records)} records)")


def main() -> int:
    try:
        sensors = export_dataset(SENSOR_LOCATIONS_DATASET)
        save("sensor_locations", sensors)
    except Exception as exc:  # noqa: BLE001
        print(f"FAILED {SENSOR_LOCATIONS_DATASET}: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
