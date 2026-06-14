from __future__ import annotations

from datetime import datetime, timezone

from . import data
from .defects import detect_process_defects
from .models import Notification, UserRole
from .scoring import compute_anomaly_score


ROLE_LABELS: dict[UserRole, str] = {
    "maintenance_engineer": "Maintenance Engineer",
    "supervisor": "Operations Supervisor",
    "stores": "Stores Planner",
}


def available_roles() -> list[dict[str, str]]:
    return [{"id": role, "label": label} for role, label in ROLE_LABELS.items()]


def notifications_for_role(role: UserRole) -> list[Notification]:
    notifications: list[Notification] = []
    now = datetime.now(timezone.utc)

    for alert in sorted(data.ALERTS.values(), key=lambda item: item.timestamp, reverse=True):
        equipment = data.EQUIPMENT[alert.equipment_id]
        if _alert_visible(role, alert.severity):
            notifications.append(
                Notification(
                    id=f"note-{role}-{alert.id}",
                    role=role,
                    equipment_id=alert.equipment_id,
                    alert_id=alert.id,
                    severity=alert.severity,
                    title=f"{equipment.name}: {alert.severity} alert",
                    message=alert.message,
                    action=_alert_action(role, alert.equipment_id, alert.severity),
                    timestamp=alert.timestamp,
                )
            )

    for equipment_id, equipment in data.EQUIPMENT.items():
        readings = [item for item in data.SENSOR_READINGS if item.equipment_id == equipment_id]
        if not readings:
            continue
        latest = sorted(readings, key=lambda item: item.timestamp)[-1]
        anomaly = compute_anomaly_score(equipment, latest)
        for defect in detect_process_defects(equipment, latest, anomaly):
            if defect.severity not in {"high", "critical"}:
                continue
            if role not in {"maintenance_engineer", "supervisor"}:
                continue
            notifications.append(
                Notification(
                    id=f"note-{role}-{defect.id}",
                    role=role,
                    equipment_id=equipment_id,
                    severity=defect.severity,
                    title=f"Process defect: {defect.defect_type.replace('_', ' ')}",
                    message=defect.explanation,
                    action=defect.recommended_action,
                    timestamp=latest.timestamp,
                )
            )

        if role == "stores":
            for part in data.SPARES:
                if part.equipment_id != equipment_id or not part.critical:
                    continue
                if part.stock > 1 and part.lead_time_days < 21:
                    continue
                severity = "critical" if part.stock == 0 else "high"
                notifications.append(
                    Notification(
                        id=f"note-{role}-{part.id}",
                        role=role,
                        equipment_id=equipment_id,
                        severity=severity,  # type: ignore[arg-type]
                        title=f"Spare pressure: {part.name}",
                        message=(
                            f"{part.name} has {part.stock} in stock with {part.lead_time_days} day lead time "
                            f"for {equipment.name}."
                        ),
                        action="Reserve available stock or start procurement before the maintenance window is missed.",
                        timestamp=now,
                    )
                )

    deduped = {item.id: item for item in notifications}
    return sorted(deduped.values(), key=lambda item: (item.severity == "critical", item.timestamp), reverse=True)[:12]


def _alert_visible(role: UserRole, severity: str) -> bool:
    if role == "maintenance_engineer":
        return severity in {"medium", "high", "critical"}
    if role == "supervisor":
        return severity in {"high", "critical"}
    return severity in {"high", "critical"}


def _alert_action(role: UserRole, equipment_id: str, severity: str) -> str:
    if role == "stores":
        return "Check critical spares and supplier lead time for this asset before work order release."
    if role == "supervisor":
        return "Coordinate production window, safety isolation, and escalation if the alert persists."
    if severity == "critical":
        return "Open a critical maintenance case and prepare isolation at the next safe window."
    return "Inspect the asset, compare the signal with manual limits, and update the maintenance log."
