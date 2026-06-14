from __future__ import annotations

import csv
import io
import sys
import urllib.request
import zipfile
from pathlib import Path


UCI_AI4I_ZIP_URL = "https://archive.ics.uci.edu/static/public/601/ai4i+2020+predictive+maintenance+dataset.zip"
DATA_DIR = Path(__file__).resolve().parents[1] / "data"
TARGET = DATA_DIR / "ai4i2020.csv"


def download_ai4i() -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if TARGET.exists() and TARGET.stat().st_size > 100_000:
        return TARGET
    print(f"Downloading AI4I 2020 dataset from UCI: {UCI_AI4I_ZIP_URL}")
    with urllib.request.urlopen(UCI_AI4I_ZIP_URL, timeout=30) as response:
        payload = response.read()
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        csv_names = [name for name in archive.namelist() if name.lower().endswith(".csv")]
        if not csv_names:
            raise RuntimeError("No CSV found inside UCI AI4I archive")
        with archive.open(csv_names[0]) as source, TARGET.open("wb") as output:
            output.write(source.read())
    return TARGET


def preview(path: Path) -> None:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = [next(reader) for _ in range(3)]
    print(f"Saved {path}")
    print(f"Columns: {', '.join(rows[0].keys())}")
    print(f"Preview UID values: {', '.join(row['UDI'] for row in rows)}")


if __name__ == "__main__":
    try:
        preview(download_ai4i())
    except Exception as exc:
        print(f"Failed to prepare AI4I data: {exc}", file=sys.stderr)
        raise

