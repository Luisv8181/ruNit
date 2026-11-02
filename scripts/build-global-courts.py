#!/usr/bin/env python
"""Build the globe's worldwide OpenStreetMap basketball court snapshot.

Requires DuckDB: python -m pip install duckdb
Source: https://layercake.openstreetmap.us/layers/pois/
"""

import json
import os
from pathlib import Path
from urllib.request import Request, urlopen
from datetime import datetime, timezone

import duckdb


SOURCE = "https://data.openstreetmap.us/layercake/pois.parquet"
# Full source snapshot; scripts/split-court-snapshot.mjs turns it into what the app serves.
OUTPUT = Path(__file__).resolve().parents[1] / "data" / "osm-courts.json"
QUERY = """
SELECT type, id,
  round((bbox.ymin + bbox.ymax) / 2, 5) AS lat,
  round((bbox.xmin + bbox.xmax) / 2, 5) AS lng
FROM read_parquet(?)
WHERE leisure IN ('pitch', 'practice_pitch')
  AND regexp_matches(sport, '(^|;)\\s*basketball\\s*(;|$)')
  AND bbox IS NOT NULL
"""


def main():
    source = os.environ.get("OSM_PARQUET_SOURCE", SOURCE)
    source_date = None
    if source.startswith("https://"):
        try:
            with urlopen(Request(source, method="HEAD"), timeout=20) as response:
                source_date = response.headers.get("Last-Modified")
        except OSError:
            pass

    db = duckdb.connect()
    rows = db.execute(QUERY + " ORDER BY lat, lng", [source])
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix(".json.tmp")
    count = 0
    seen = set()
    try:
        with temporary.open("w", encoding="utf-8") as file:
            metadata = {
                "region": "the world",
                "fetchedAt": datetime.now(timezone.utc).isoformat(),
                "sourceUpdatedAt": source_date,
                "complete": True,
                "attribution": "© OpenStreetMap contributors, ODbL",
                "source": "OpenStreetMap US Layercake POIs",
            }
            file.write(json.dumps(metadata, ensure_ascii=False)[:-1] + ',"points":[')
            while batch := rows.fetchmany(10000):
                for kind, osm_id, lat, lng in batch:
                    if (kind, osm_id) in seen or lat is None or lng is None:
                        continue
                    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                        continue
                    seen.add((kind, osm_id))
                    if count:
                        file.write(",")
                    kind_code = {"node": 0, "way": 1, "relation": 2}.get(kind)
                    if kind_code is None:
                        continue
                    file.write(json.dumps([round(float(lat), 5), round(float(lng), 5), kind_code, osm_id], separators=(",", ":")))
                    count += 1
            file.write(f'],"count":{count}}}')
        if not count:
            raise RuntimeError("No basketball courts found; refusing to publish an empty snapshot")
        os.replace(temporary, OUTPUT)
    finally:
        if temporary.exists():
            temporary.unlink()
        db.close()
    print(f"Saved {count:,} mapped courts to {OUTPUT}")


if __name__ == "__main__":
    main()
