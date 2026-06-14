from __future__ import annotations

import csv
import io
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
AI4I_PATH = DATA_DIR / "ai4i2020.csv"
UCI_AI4I_ZIP_URL = "https://archive.ics.uci.edu/static/public/601/ai4i+2020+predictive+maintenance+dataset.zip"


@dataclass(frozen=True)
class Ai4iRow:
    uid: int
    product_id: str
    machine_type: str
    air_temperature_k: float
    process_temperature_k: float
    rotational_speed_rpm: float
    torque_nm: float
    tool_wear_min: float
    machine_failure: int
    twf: int
    hdf: int
    pwf: int
    osf: int
    rnf: int

    @property
    def failure_modes(self) -> list[str]:
        labels = []
        if self.twf:
            labels.append("tool_wear_failure")
        if self.hdf:
            labels.append("heat_dissipation_failure")
        if self.pwf:
            labels.append("power_failure")
        if self.osf:
            labels.append("overstrain_failure")
        if self.rnf:
            labels.append("random_failure")
        return labels


def ensure_ai4i_dataset() -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if AI4I_PATH.exists() and AI4I_PATH.stat().st_size > 100_000:
        return AI4I_PATH
    with urllib.request.urlopen(UCI_AI4I_ZIP_URL, timeout=30) as response:
        payload = response.read()
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        csv_names = [name for name in archive.namelist() if name.lower().endswith(".csv")]
        if not csv_names:
            raise RuntimeError("No CSV found inside AI4I archive")
        with archive.open(csv_names[0]) as source, AI4I_PATH.open("wb") as target:
            target.write(source.read())
    return AI4I_PATH


def load_ai4i_rows(limit: int | None = 1500) -> list[Ai4iRow]:
    path = ensure_ai4i_dataset()
    rows: list[Ai4iRow] = []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for raw in reader:
            rows.append(
                Ai4iRow(
                    uid=int(raw["UDI"]),
                    product_id=raw["Product ID"],
                    machine_type=raw["Type"],
                    air_temperature_k=float(raw["Air temperature [K]"]),
                    process_temperature_k=float(raw["Process temperature [K]"]),
                    rotational_speed_rpm=float(raw["Rotational speed [rpm]"]),
                    torque_nm=float(raw["Torque [Nm]"]),
                    tool_wear_min=float(raw["Tool wear [min]"]),
                    machine_failure=int(raw["Machine failure"]),
                    twf=int(raw["TWF"]),
                    hdf=int(raw["HDF"]),
                    pwf=int(raw["PWF"]),
                    osf=int(raw["OSF"]),
                    rnf=int(raw["RNF"]),
                )
            )
            if limit and len(rows) >= limit:
                break
    if len(rows) < 12:
        raise RuntimeError("AI4I dataset did not provide enough rows for streaming demo")
    return rows

