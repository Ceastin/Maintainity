from __future__ import annotations

from .models import Equipment, HealthMetric, RulEstimate, SensorReading


UNITS = {
    "temperature_c": "C",
    "vibration_mm_s": "mm/s",
    "current_a": "A",
    "speed_rpm": "rpm",
    "torque_nm": "Nm",
    "tool_wear_min": "min",
    "delay_minutes": "min",
    "pressure_bar": "bar",
    "flow_m3_h": "m3/h",
    "oil_particles_ppm": "ppm",
}


def _metric_risk(value: float, threshold: dict[str, float]) -> float:
    risks: list[float] = []
    if "max" in threshold:
        max_value = threshold["max"]
        if max_value > 0:
            risks.append(max(0.0, (value - (0.75 * max_value)) / (0.25 * max_value)))
    if "min" in threshold:
        min_value = threshold["min"]
        if min_value > 0:
            risks.append(max(0.0, ((1.15 * min_value) - value) / (0.15 * min_value)))
    return min(1.0, max(risks) if risks else 0.0)


def _status_from_score(score: float) -> str:
    if score >= 0.86:
        return "critical"
    if score >= 0.62:
        return "high"
    if score >= 0.36:
        return "medium"
    return "low"


def metric_threshold_label(threshold: dict[str, float]) -> str:
    parts = []
    if "min" in threshold:
        parts.append(f">= {threshold['min']:g}")
    if "max" in threshold:
        parts.append(f"<= {threshold['max']:g}")
    return " / ".join(parts) if parts else "n/a"


def build_health_metrics(equipment: Equipment, reading: SensorReading) -> list[HealthMetric]:
    metrics = []
    for name, value in reading.metrics.items():
        threshold = equipment.thresholds.get(name, {})
        risk = _metric_risk(value, threshold)
        metrics.append(
            HealthMetric(
                name=name,
                value=round(value, 2),
                unit=UNITS.get(name, ""),
                status=_status_from_score(risk),
                threshold=metric_threshold_label(threshold),
            )
        )
    return metrics


def compute_anomaly_score(equipment: Equipment, reading: SensorReading) -> float:
    metric_risks = [
        _metric_risk(value, equipment.thresholds.get(name, {}))
        for name, value in reading.metrics.items()
        if name in equipment.thresholds
    ]
    if not metric_risks:
        return 0.0
    weighted = (max(metric_risks) * 0.55) + (sum(metric_risks) / len(metric_risks) * 0.45)
    return round(min(1.0, weighted), 3)


def estimate_rul(equipment: Equipment, reading: SensorReading, anomaly_score: float) -> RulEstimate:
    delay = reading.metrics.get("delay_minutes", 0)
    delay_norm = min(1.0, delay / max(1.0, equipment.thresholds.get("delay_minutes", {}).get("max", 25)))
    degradation = min(1.0, anomaly_score * 0.64 + equipment.criticality * 0.12 + delay_norm * 0.24)
    hours = int(max(8, 720 * (1 - degradation)))
    confidence = round(0.58 + min(0.32, len(reading.metrics) * 0.045), 2)
    return RulEstimate(hours=hours, confidence=confidence, degradation_score=round(degradation, 3))


def compute_priority_score(
    equipment: Equipment,
    reading: SensorReading,
    anomaly_score: float,
    spare_pressure: float,
    ml_failure_probability: float = 0.0,
) -> float:
    delay = reading.metrics.get("delay_minutes", 0)
    delay_limit = equipment.thresholds.get("delay_minutes", {}).get("max", 25)
    delay_norm = min(1.0, delay / max(1.0, delay_limit))
    ml_signal = max(0.0, min(1.0, ml_failure_probability))
    score = (
        equipment.criticality * 26
        + anomaly_score * 36
        + delay_norm * 16
        + spare_pressure * 14
        + min(1.0, reading.metrics.get("temperature_c", 0) / 110) * 8
        + ml_signal * 18
    )
    return round(min(100.0, score), 1)


def risk_from_priority(priority_score: float) -> str:
    if priority_score >= 78:
        return "critical"
    if priority_score >= 58:
        return "high"
    if priority_score >= 35:
        return "medium"
    return "low"


def urgency_from_risk(risk_level: str, rul_hours: int) -> str:
    if risk_level == "critical" or rul_hours <= 72:
        return "shutdown_window"
    if risk_level == "high" or rul_hours <= 168:
        return "urgent"
    if risk_level == "medium":
        return "schedule"
    return "monitor"
