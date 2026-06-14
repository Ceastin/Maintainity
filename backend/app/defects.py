from __future__ import annotations

from .models import Equipment, ProcessDefect, SensorReading


def detect_process_defects(equipment: Equipment, reading: SensorReading, anomaly_score: float) -> list[ProcessDefect]:
    metrics = reading.metrics
    defects: list[ProcessDefect] = []

    def value(name: str) -> float:
        return float(metrics.get(name, 0.0))

    def max_limit(name: str, fallback: float = 1.0) -> float:
        return float(equipment.thresholds.get(name, {}).get("max", fallback))

    def min_limit(name: str, fallback: float = 0.0) -> float:
        return float(equipment.thresholds.get(name, {}).get("min", fallback))

    def severity(confidence: float) -> str:
        if confidence >= 0.86:
            return "critical"
        if confidence >= 0.66:
            return "high"
        if confidence >= 0.42:
            return "medium"
        return "low"

    def add(defect_type: str, confidence: float, signals: list[str], explanation: str, action: str) -> None:
        confidence = round(max(0.0, min(1.0, confidence)), 2)
        defects.append(
            ProcessDefect(
                id=f"def-{equipment.id}-{defect_type}",
                equipment_id=equipment.id,
                defect_type=defect_type,
                severity=severity(confidence),  # type: ignore[arg-type]
                confidence=confidence,
                signals=signals,
                explanation=explanation,
                recommended_action=action,
            )
        )

    delay_limit = max_limit("delay_minutes", 25)
    delay_score = min(1.0, value("delay_minutes") / max(1.0, delay_limit))

    if equipment.id == "rm-motor-01":
        temp_score = value("temperature_c") / max_limit("temperature_c", 92)
        vibration_score = value("vibration_mm_s") / max_limit("vibration_mm_s", 7.2)
        current_score = value("current_a") / max_limit("current_a", 420)
        torque_score = value("torque_nm") / max_limit("torque_nm", 62)
        if temp_score >= 0.9 and vibration_score >= 0.82:
            add(
                "thermal_vibration_cascade",
                0.58 + min(0.34, (temp_score + vibration_score - 1.72) * 0.55),
                ["temperature_c", "vibration_mm_s"],
                "Rolling stand drive heat and vibration are rising together, consistent with bearing lubrication loss or coupling misalignment.",
                "Reduce rolling load, inspect bearing housings and coupling, and hold restart until vibration returns below the alert band.",
            )
        if current_score >= 0.88 or (torque_score >= 0.92 and value("speed_rpm") < 1450):
            add(
                "rolling_load_overstrain",
                max(current_score, torque_score) * 0.82,
                ["current_a", "torque_nm", "speed_rpm"],
                "Current and torque indicate high load stress on the drive, which can create surface-quality defects and motor trips during rolling.",
                "Check pass schedule, motor load sharing, and coupling alignment before the next high-load campaign.",
            )

    elif equipment.id == "bf-pump-07":
        flow_limit = min_limit("flow_m3_h", 420)
        pressure_limit = min_limit("pressure_bar", 4.8)
        flow_score = max(0.0, (flow_limit * 1.08 - value("flow_m3_h")) / max(1.0, flow_limit * 0.18))
        pressure_score = max(0.0, (pressure_limit * 1.1 - value("pressure_bar")) / max(1.0, pressure_limit * 0.22))
        vibration_score = value("vibration_mm_s") / max_limit("vibration_mm_s", 5.8)
        if flow_score >= 0.28 or pressure_score >= 0.28:
            add(
                "cooling_flow_restriction",
                0.45 + min(0.45, max(flow_score, pressure_score) * 0.5),
                ["flow_m3_h", "pressure_bar"],
                "Cooling loop flow or pressure is drifting toward furnace-risk limits, suggesting strainer blockage, valve restriction, or air ingress.",
                "Start the standby pump if recovery is not immediate, then check suction valve, strainer differential pressure, and casing vent.",
            )
        if vibration_score >= 0.82 and pressure_score >= 0.2:
            add(
                "cavitation_risk",
                0.5 + min(0.4, (vibration_score + pressure_score) * 0.25),
                ["vibration_mm_s", "pressure_bar"],
                "Pump vibration combined with pressure decay is consistent with cavitation risk under blast-furnace cooling demand.",
                "Inspect suction-side air leaks and confirm net positive suction head before returning to normal duty.",
            )

    elif equipment.id == "conv-gearbox-03":
        particle_score = value("oil_particles_ppm") / max_limit("oil_particles_ppm", 95)
        vibration_score = value("vibration_mm_s") / max_limit("vibration_mm_s", 6.4)
        wear_score = value("tool_wear_min") / max_limit("tool_wear_min", 195)
        if particle_score >= 0.86:
            add(
                "oil_contamination_ingress",
                0.5 + min(0.42, (particle_score - 0.86) * 0.75 + vibration_score * 0.16),
                ["oil_particles_ppm", "vibration_mm_s"],
                "Oil particle count is in the contamination band, indicating dust ingress or early gear/bearing wear.",
                "Take an oil sample, clean the breather, replace oil if particles persist, and inspect the magnetic plug.",
            )
        if wear_score >= 0.85 and vibration_score >= 0.72:
            add(
                "gear_wear_progression",
                0.46 + min(0.4, (wear_score + vibration_score - 1.57) * 0.55),
                ["tool_wear_min", "vibration_mm_s"],
                "Wear and vibration are moving together, which can precede tooth contact damage in the conveyor gearbox.",
                "Schedule borescope inspection and align procurement for the stage 2 gearset if the next sample worsens.",
            )

    if delay_score >= 0.5:
        add(
            "production_delay_bottleneck",
            0.4 + min(0.46, delay_score * 0.42 + equipment.criticality * 0.1),
            ["delay_minutes"],
            "Delay minutes are high enough to make this asset a production bottleneck, not only a maintenance concern.",
            "Prioritize the asset in the shift maintenance queue and coordinate the work window with operations.",
        )

    if not defects and anomaly_score >= 0.55:
        add(
            "unclassified_process_abnormality",
            max(0.42, anomaly_score * 0.78),
            list(metrics)[:4],
            "Telemetry is outside the normal operating envelope, but the current rules do not isolate a more specific defect mode.",
            "Collect one more sample, compare against manual limits, and keep the asset on watch until the trend clears.",
        )

    defects.sort(key=lambda item: (item.confidence, item.severity), reverse=True)
    return defects[:4]
