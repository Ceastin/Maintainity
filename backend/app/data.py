from __future__ import annotations

import csv
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from .dataset_loader import Ai4iRow, DATA_DIR, load_ai4i_rows
from .models import (
    Alert,
    ChatTurn,
    DocumentChunk,
    Equipment,
    FeedbackRecord,
    MaintenanceLog,
    Recommendation,
    SensorReading,
    SparePart,
)


BASE_TIME = datetime(2026, 6, 7, 2, 0, tzinfo=timezone.utc)
EQUIPMENT_PATH = DATA_DIR / "equipment.json"
SPARES_PATH = DATA_DIR / "spares.csv"
LOGS_PATH = DATA_DIR / "maintenance_logs.csv"
MANUALS_DIR = DATA_DIR / "manuals"
FEEDBACK_PATH = DATA_DIR / "runtime_feedback.json"

EQUIPMENT_BASE_INDICES = {
    "rm-motor-01": 66,
    "bf-pump-07": 600,
    "conv-gearbox-03": 74,
}

STREAM_STATE: dict[str, Any] = {
    "step": 0,
    "source": "UCI AI4I 2020 Predictive Maintenance Dataset",
    "source_url": "https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset",
}


def _load_equipment() -> dict[str, Equipment]:
    raw_items = json.loads(EQUIPMENT_PATH.read_text(encoding="utf-8"))
    return {item["id"]: Equipment(**item) for item in raw_items}


def _load_spares() -> list[SparePart]:
    with SPARES_PATH.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        return [
            SparePart(
                id=row["id"],
                equipment_id=row["equipment_id"],
                name=row["name"],
                stock=int(row["stock"]),
                lead_time_days=int(row["lead_time_days"]),
                supplier=row["supplier"],
                critical=row["critical"].lower() == "true",
            )
            for row in reader
        ]


def _dt(value: str) -> datetime:
    return datetime.fromisoformat(value).replace(tzinfo=timezone.utc)


def _load_logs() -> list[MaintenanceLog]:
    with LOGS_PATH.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        return [
            MaintenanceLog(
                id=row["id"],
                equipment_id=row["equipment_id"],
                timestamp=_dt(row["timestamp"]),
                title=row["title"],
                summary=row["summary"],
                downtime_minutes=int(row["downtime_minutes"]),
                root_cause=row["root_cause"],
                action_taken=row["action_taken"],
            )
            for row in reader
        ]


def _parse_metadata(block: str) -> dict[str, str]:
    metadata: dict[str, str] = {}
    for line in block.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        metadata[key.strip()] = value.strip()
    return metadata


def _load_documents() -> list[DocumentChunk]:
    documents: list[DocumentChunk] = []
    pattern = re.compile(r"---\s*\n(.*?)\n---\s*\n(.*?)(?=\n---\s*\n|\Z)", re.DOTALL)
    for path in sorted(MANUALS_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        for index, match in enumerate(pattern.finditer(text), start=1):
            metadata = _parse_metadata(match.group(1))
            chunk_metadata = {
                key: value
                for key, value in metadata.items()
                if key not in {"equipment_id", "source_type", "title", "section"}
            }
            chunk_metadata.update(
                {
                    "file": path.name,
                    "dataset_mapping": "AI4I sensor semantics mapped to steel equipment",
                }
            )
            documents.append(
                DocumentChunk(
                    id=f"{path.stem}-{index}",
                    equipment_id=metadata["equipment_id"],
                    source_type=metadata["source_type"],  # type: ignore[arg-type]
                    title=metadata["title"],
                    section=metadata["section"],
                    text=match.group(2).strip(),
                    metadata=chunk_metadata,
                )
            )
    return documents


def _load_feedback() -> list[FeedbackRecord]:
    if not FEEDBACK_PATH.exists():
        return []
    try:
        raw_items = json.loads(FEEDBACK_PATH.read_text(encoding="utf-8"))
        return [FeedbackRecord.model_validate(item) for item in raw_items]
    except (OSError, ValueError, TypeError):
        return []


def persist_feedback() -> None:
    FEEDBACK_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = [item.model_dump(mode="json") for item in FEEDBACK]
    FEEDBACK_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def remember_chat_turn(
    conversation_id: str,
    role: str,
    message: str,
    equipment_id: str | None = None,
    recommendation_id: str | None = None,
) -> ChatTurn:
    turn = ChatTurn(
        conversation_id=conversation_id,
        role=role,  # type: ignore[arg-type]
        message=message,
        timestamp=datetime.now(timezone.utc),
        equipment_id=equipment_id,
        recommendation_id=recommendation_id,
    )
    CHAT_HISTORY.setdefault(conversation_id, []).append(turn)
    CHAT_HISTORY[conversation_id] = CHAT_HISTORY[conversation_id][-18:]
    return turn


def conversation_context(conversation_id: str | None, limit: int = 8) -> list[ChatTurn]:
    if not conversation_id:
        return []
    return CHAT_HISTORY.get(conversation_id, [])[-limit:]


def _temperature_c(row: Ai4iRow) -> float:
    return round(row.process_temperature_k - 273.15, 2)


def _failure_bias(row: Ai4iRow, amount: float = 1.0) -> float:
    return amount if row.machine_failure else 0.0


def _map_ai4i_to_metrics(equipment_id: str, row: Ai4iRow) -> dict[str, float]:
    process_c = _temperature_c(row)
    torque = row.torque_nm
    wear = row.tool_wear_min
    speed = row.rotational_speed_rpm
    if equipment_id == "rm-motor-01":
        return {
            "temperature_c": round(process_c + 49 + row.hdf * 8 + max(0, torque - 55) * 0.18, 2),
            "vibration_mm_s": round(3.2 + wear / 62 + abs(torque - 42) / 18 + _failure_bias(row, 1.15), 2),
            "current_a": round(225 + torque * 4.2 + max(0, 1400 - speed) * 0.11 + row.pwf * 88 + row.osf * 34, 2),
            "speed_rpm": round(speed, 2),
            "torque_nm": round(torque, 2),
            "tool_wear_min": round(wear, 2),
            "delay_minutes": round(row.machine_failure * 24 + max(0, wear - 180) / 3.8 + row.pwf * 8, 2),
        }
    if equipment_id == "bf-pump-07":
        pressure = 7.05 - max(0, torque - 55) * 0.05 - row.pwf * 1.1 - row.osf * 0.35 - row.hdf * 0.25
        flow = 520 - abs(speed - 1500) * 0.06 - max(0, torque - 55) * 4 - row.pwf * 92 - row.machine_failure * 18
        return {
            "temperature_c": round(process_c + 38 + row.hdf * 8 + max(0, torque - 60) * 0.15, 2),
            "vibration_mm_s": round(2.5 + abs(torque - 45) / 20 + wear / 105 + _failure_bias(row, 0.85), 2),
            "pressure_bar": round(max(3.2, pressure), 2),
            "flow_m3_h": round(max(250, flow), 2),
            "torque_nm": round(torque, 2),
            "tool_wear_min": round(wear, 2),
            "delay_minutes": round(row.machine_failure * 14 + max(0, 420 - flow) / 12, 2),
        }
    oil_particles = 35 + wear * 0.32 + row.twf * 34 + row.osf * 20 + row.machine_failure * 8
    return {
        "temperature_c": round(process_c + 38 + row.twf * 5 + max(0, torque - 58) * 0.18, 2),
        "vibration_mm_s": round(2.8 + wear / 65 + max(0, torque - 50) / 16 + _failure_bias(row, 0.7), 2),
        "oil_particles_ppm": round(oil_particles, 2),
        "speed_rpm": round(speed / 10, 2),
        "torque_nm": round(torque, 2),
        "tool_wear_min": round(wear, 2),
        "delay_minutes": round(row.twf * 18 + row.osf * 12 + max(0, oil_particles - 95) / 3, 2),
    }


def _signal_for(equipment_id: str, row: Ai4iRow) -> str:
    if equipment_id == "rm-motor-01":
        if row.hdf:
            return "temperature_c"
        if row.pwf:
            return "current_a"
        return "vibration_mm_s"
    if equipment_id == "bf-pump-07":
        if row.pwf:
            return "flow_m3_h"
        if row.hdf:
            return "temperature_c"
        return "pressure_bar"
    if row.twf or row.osf:
        return "oil_particles_ppm"
    return "vibration_mm_s"


def _severity_for(row: Ai4iRow, metrics: dict[str, float]) -> str:
    if row.machine_failure and (row.hdf or row.pwf or row.osf):
        return "critical"
    if row.machine_failure:
        return "high"
    if row.tool_wear_min >= 190 or metrics.get("delay_minutes", 0) > 10:
        return "medium"
    return "low"


def _alert_message(equipment_id: str, row: Ai4iRow) -> str:
    modes = ", ".join(row.failure_modes) if row.failure_modes else "pre-failure drift"
    equipment = EQUIPMENT[equipment_id]
    return f"{equipment.name} telemetry mapped from AI4I row {row.uid} shows {modes.replace('_', ' ')} signature."


def _reading_from_row(equipment_id: str, row: Ai4iRow, timestamp: datetime) -> SensorReading:
    return SensorReading(
        equipment_id=equipment_id,
        timestamp=timestamp,
        metrics=_map_ai4i_to_metrics(equipment_id, row),
    )


def _stream_row(equipment_id: str, offset: int = 0) -> Ai4iRow:
    base = EQUIPMENT_BASE_INDICES[equipment_id]
    return AI4I_ROWS[(base + STREAM_STATE["step"] + offset) % len(AI4I_ROWS)]


def _rebuild_initial_stream() -> None:
    SENSOR_READINGS.clear()
    ALERTS.clear()
    for equipment_id in EQUIPMENT:
        for offset in range(4):
            row = _stream_row(equipment_id, offset)
            timestamp = BASE_TIME + timedelta(hours=offset * 2)
            SENSOR_READINGS.append(_reading_from_row(equipment_id, row, timestamp))
        _upsert_alert_for_latest(equipment_id)


def _upsert_alert_for_latest(equipment_id: str) -> None:
    latest = sorted([item for item in SENSOR_READINGS if item.equipment_id == equipment_id], key=lambda item: item.timestamp)[-1]
    row = _stream_row(equipment_id, 3)
    severity = _severity_for(row, latest.metrics)
    if severity == "low":
        return
    signal = _signal_for(equipment_id, row)
    alert = Alert(
        id=f"alert-{equipment_id}-{row.uid}",
        equipment_id=equipment_id,
        timestamp=latest.timestamp + timedelta(minutes=5),
        severity=severity,  # type: ignore[arg-type]
        message=_alert_message(equipment_id, row),
        signal=signal,
        value=latest.metrics.get(signal, 0.0),
    )
    ALERTS[alert.id] = alert


def advance_stream(steps: int = 1) -> dict[str, Any]:
    steps = max(1, min(steps, 24))
    for _ in range(steps):
        STREAM_STATE["step"] += 1
        next_time = max(item.timestamp for item in SENSOR_READINGS) + timedelta(minutes=2)
        for equipment_id in EQUIPMENT:
            row = _stream_row(equipment_id, 3)
            SENSOR_READINGS.append(_reading_from_row(equipment_id, row, next_time))
            equipment_readings = [item for item in SENSOR_READINGS if item.equipment_id == equipment_id]
            if len(equipment_readings) > 60:
                oldest = sorted(equipment_readings, key=lambda item: item.timestamp)[0]
                SENSOR_READINGS.remove(oldest)
            _upsert_alert_for_latest(equipment_id)
    return dataset_status()


def dataset_status() -> dict[str, Any]:
    failure_count = sum(row.machine_failure for row in AI4I_ROWS)
    return {
        "source": STREAM_STATE["source"],
        "source_url": STREAM_STATE["source_url"],
        "rows_loaded": len(AI4I_ROWS),
        "failure_rows_loaded": failure_count,
        "stream_step": STREAM_STATE["step"],
        "equipment_mappings": len(EQUIPMENT),
        "latest_uids": {equipment_id: _stream_row(equipment_id, 3).uid for equipment_id in EQUIPMENT},
    }


EQUIPMENT = _load_equipment()
AI4I_ROWS = load_ai4i_rows(limit=None)
SPARES = _load_spares()
MAINTENANCE_LOGS = _load_logs()
DOCUMENTS = _load_documents()
FEEDBACK: list[FeedbackRecord] = _load_feedback()
CHAT_HISTORY: dict[str, list[ChatTurn]] = {}
RECOMMENDATIONS: dict[str, Recommendation] = {}
SENSOR_READINGS: list[SensorReading] = []
ALERTS: dict[str, Alert] = {}
_rebuild_initial_stream()
