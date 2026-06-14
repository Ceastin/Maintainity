from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from . import data
from .defects import detect_process_defects
from .ml_model import predict_failure
from .models import Evidence, Recommendation
from .openai_client import generate_diagnosis_and_actions
from .rag import search_evidence
from .scoring import compute_anomaly_score, compute_priority_score, estimate_rul, risk_from_priority, urgency_from_risk


def latest_reading(equipment_id: str):
    readings = [reading for reading in data.SENSOR_READINGS if reading.equipment_id == equipment_id]
    if not readings:
        raise KeyError(f"No readings found for {equipment_id}")
    return sorted(readings, key=lambda reading: reading.timestamp)[-1]


def infer_equipment_id(message: str) -> str:
    text = message.lower()
    for equipment in data.EQUIPMENT.values():
        if equipment.id in text or any(part.lower() in text for part in equipment.name.split()[:3]):
            return equipment.id
    if "pump" in text or "cooling" in text or "flow" in text:
        return "bf-pump-07"
    if "gearbox" in text or "oil" in text or "conveyor" in text:
        return "conv-gearbox-03"
    return "rm-motor-01"


def _spare_pressure(equipment_id: str) -> float:
    parts = [part for part in data.SPARES if part.equipment_id == equipment_id and part.critical]
    if not parts:
        return 0.0
    pressure = 0.0
    for part in parts:
        stock_pressure = 1.0 if part.stock == 0 else 0.25 if part.stock == 1 else 0.0
        lead_pressure = min(1.0, part.lead_time_days / 30)
        pressure = max(pressure, (stock_pressure * 0.7) + (lead_pressure * 0.3))
    return round(pressure, 2)


def _metric_phrase(reading) -> str:
    ordered = sorted(reading.metrics.items(), key=lambda item: item[1], reverse=True)
    return " ".join(f"{name} {value}" for name, value in ordered)


def _root_causes(equipment_id: str, evidence: list[Evidence]) -> list[str]:
    evidence_text = " ".join(item.excerpt.lower() for item in evidence)
    if equipment_id == "rm-motor-01":
        causes = [
            "AI4I heat-dissipation or power-failure pattern mapped to drive motor thermal/load stress.",
            "Drive-end or non-drive-end bearing lubrication breakdown causing heat and vibration rise.",
            "Coupling insert wear or misalignment increasing rotor load and current draw.",
        ]
        if "pitted bearing" in evidence_text:
            causes.append("Repeat bearing race damage pattern similar to the April failure analysis.")
        return causes[:4]
    if equipment_id == "bf-pump-07":
        return [
            "AI4I power-failure torque/speed imbalance mapped to pump load instability.",
            "Suction strainer blockage or suction-side air ingress reducing cooling flow.",
            "Cavitation from pressure decay creating vibration and thermal stress.",
            "Mechanical seal or impeller wear reducing pump efficiency under furnace cooling demand.",
        ]
    return [
        "AI4I tool-wear or overstrain pattern mapped to gearbox oil contamination and wear progression.",
        "Oil contamination from breather or inspection cover gasket allowing abrasive particles.",
        "Early gear tooth or bearing wear indicated by particle count and vibration trend.",
        "High dust exposure after yard shift increasing contamination load.",
    ]


def _actions(equipment_id: str, risk_level: str) -> tuple[list[str], list[str], str]:
    if equipment_id == "rm-motor-01":
        immediate = [
            "Reduce rolling load and isolate the motor at the next safe pass gap.",
            "Capture thermography and inspect bearing housings, grease lines, and coupling insert.",
            "Reserve the bearing kit and coupling insert before opening the drive.",
            "Restart only if vibration falls below 7.5 mm/s after lubrication and alignment check.",
        ]
        long_term = [
            "Shorten high-load campaign lubrication inspection interval from weekly to every 72 hours.",
            "Trend current draw against pass schedule to flag overload before thermal escalation.",
            "Add summer campaign pre-check for coupling elastomer cracks and soft-foot alignment.",
        ]
        trigger = "Escalate to shutdown repair if vibration stays above 7.5 mm/s or temperature stays above 92 C for 15 minutes after lubrication."
    elif equipment_id == "bf-pump-07":
        immediate = [
            "Start standby pump if flow remains below 420 m3/h for more than 10 minutes.",
            "Check suction valve, strainer differential pressure, casing vent, and seal leakage.",
            "Inspect for cavitation noise and confirm cooling loop pressure recovery.",
        ]
        long_term = [
            "Add strainer differential pressure trend to the alert model.",
            "Keep one mechanical seal cartridge available before furnace high-output operation.",
            "Review suction flange leak checks after every upstream strainer maintenance.",
        ]
        trigger = "Escalate immediately if flow remains below 420 m3/h or tuyere cooling temperature rises while standby pump is unavailable."
    else:
        immediate = [
            "Take oil sample and inspect magnetic plug before next high-load conveyor run.",
            "Replace oil, clean breather, and verify inspection cover gasket seal.",
            "Schedule borescope if particle count remains above 95 ppm after one shift.",
        ]
        long_term = [
            "Add dust-seal inspection to yard shift handover.",
            "Trend particle count with vibration to separate contamination from wear.",
            "Plan gearset procurement because lead time exceeds normal corrective window.",
        ]
        trigger = "Escalate to planned outage if particle count increases after oil change or vibration exceeds 6.4 mm/s."
    if risk_level == "critical":
        immediate.insert(0, "Notify area supervisor and open a critical maintenance case.")
    return immediate, long_term, trigger


def _spare_strategy(equipment_id: str) -> list[str]:
    strategy = []
    for part in data.SPARES:
        if part.equipment_id != equipment_id:
            continue
        if part.stock > 0:
            strategy.append(f"Reserve {part.stock} x {part.name}; replenishment lead time is {part.lead_time_days} days.")
        else:
            strategy.append(f"Expedite {part.name}; no stock available and supplier lead time is {part.lead_time_days} days.")
    return strategy


def generate_recommendation(equipment_id: str, query: str, alert_id: str | None = None) -> Recommendation:
    if equipment_id not in data.EQUIPMENT:
        raise KeyError(f"Unknown equipment {equipment_id}")
    equipment = data.EQUIPMENT[equipment_id]
    reading = latest_reading(equipment_id)
    alert = data.ALERTS.get(alert_id or "")
    evidence_query = (
        f"{equipment.name} {query} {_metric_phrase(reading)} {alert.message if alert else ''} "
        "manual SOP failure report incident breakdown delay log fault event abnormality alert "
        "historical maintenance spare stock lead time engineer feedback"
    )
    evidence = search_evidence(equipment_id, evidence_query, limit=5)
    anomaly = compute_anomaly_score(equipment, reading)
    rul = estimate_rul(equipment, reading, anomaly)
    ml_prediction = predict_failure(equipment, reading)
    priority = compute_priority_score(
        equipment,
        reading,
        anomaly,
        _spare_pressure(equipment_id),
        ml_prediction.failure_probability if ml_prediction else 0.0,
    )
    risk_level = risk_from_priority(priority)
    urgency = urgency_from_risk(risk_level, rul.hours)
    process_defects = detect_process_defects(equipment, reading, anomaly)

    # ── Try LLM-enhanced root causes and actions first, fall back to templates ──
    llm_result = generate_diagnosis_and_actions(
        equipment_context={
            "id": equipment.id,
            "name": equipment.name,
            "area": equipment.area,
            "asset_type": equipment.asset_type,
            "criticality": equipment.criticality,
            "description": equipment.description,
        },
        sensor_metrics=reading.metrics,
        evidence_items=[
            {"title": item.title, "source_type": item.source_type, "excerpt": item.excerpt}
            for item in evidence[:5]
        ],
        anomaly_score=anomaly,
        rul_hours=rul.hours,
        risk_level=risk_level,
        urgency=urgency,
        ml_prediction=ml_prediction.model_dump() if ml_prediction else None,
        process_defects=[item.model_dump() for item in process_defects[:3]],
        alert_message=alert.message if alert else None,
    )

    used_llm_reasoning = False
    if llm_result:
        causes = llm_result["root_causes"]
        immediate = llm_result["immediate_actions"]
        long_term = llm_result["long_term_actions"]
        trigger = llm_result["escalation_trigger"]
        used_llm_reasoning = True
    else:
        # Fallback to template-based reasoning
        causes = _root_causes(equipment_id, evidence)
        for defect in process_defects[:2]:
            causes.append(f"Process rule flags {defect.defect_type.replace('_', ' ')}: {defect.explanation}")
        if ml_prediction and ml_prediction.failure_likely and ml_prediction.predicted_failure_mode != "none":
            causes.insert(
                0,
                (
                    f"Trained AI4I classifier flags {ml_prediction.predicted_failure_mode.replace('_', ' ')} "
                    f"with {int(ml_prediction.failure_probability * 100)}% failure probability."
                ),
            )
        immediate, long_term, trigger = _actions(equipment_id, risk_level)

    diagnosis = _diagnosis(equipment_id, reading, risk_level, ml_prediction)
    feedback_used = any(item.source_type == "feedback" for item in evidence)
    ml_confidence_lift = 0.04 if ml_prediction and ml_prediction.failure_likely else 0.02 if ml_prediction else 0.0
    llm_confidence_lift = 0.05 if used_llm_reasoning else 0.0
    confidence = round(min(0.96, 0.62 + anomaly * 0.16 + len(evidence) * 0.035 + (0.06 if feedback_used else 0) + ml_confidence_lift + llm_confidence_lift), 2)
    node_trace = [
        {"node": "triage", "status": "complete", "summary": f"Mapped query to {equipment.name} with risk {risk_level}."},
        {"node": "evidence_retrieval", "status": "complete", "summary": f"Retrieved {len(evidence)} source-backed evidence items."},
        {"node": "prediction", "status": "complete", "summary": f"Anomaly score {anomaly}; RUL {rul.hours} hours."},
        {"node": "process_defect_rules", "status": "complete", "summary": f"Detected {len(process_defects)} steel process defect indicators."},
    ]
    if ml_prediction:
        node_trace.append(
            {
                "node": "ml_classifier",
                "status": "complete",
                "summary": (
                    f"{ml_prediction.model_name} estimated {int(ml_prediction.failure_probability * 100)}% failure probability "
                    f"and mode {ml_prediction.predicted_failure_mode.replace('_', ' ')}."
                ),
            }
        )
    if used_llm_reasoning:
        node_trace.append(
            {
                "node": "llm_reasoning",
                "status": "complete",
                "summary": "Root causes and actions generated by LLM using RAG evidence, sensor data, ML prediction, and process defect context.",
            }
        )
    else:
        node_trace.append(
            {
                "node": "llm_reasoning",
                "status": "fallback",
                "summary": "OpenAI unavailable or request failed; used domain-specific template reasoning with ML and defect augmentation.",
            }
        )
    node_trace.extend(
        [
            {"node": "maintenance_planner", "status": "complete", "summary": f"Urgency set to {urgency} with spare pressure {_spare_pressure(equipment_id)}."},
            {"node": "report_ready", "status": "complete", "summary": "Structured recommendation is ready for dashboard and report generation."},
        ]
    )
    recommendation = Recommendation(
        id=f"rec-{uuid4().hex[:10]}",
        equipment_id=equipment_id,
        alert_id=alert.id if alert else alert_id,
        diagnosis=diagnosis,
        probable_root_causes=causes,
        risk_level=risk_level,  # type: ignore[arg-type]
        urgency=urgency,  # type: ignore[arg-type]
        rul_estimate=rul,
        evidence=evidence,
        immediate_actions=immediate,
        long_term_actions=long_term,
        spare_strategy=_spare_strategy(equipment_id),
        process_defects=process_defects,
        confidence=confidence,
        assumptions=[
            "Sensor data is simulated for the hackathon prototype.",
            "RUL is a degradation-index estimate, not a certified reliability model.",
            "Recommendation assumes maintenance can intervene during the next safe production window.",
        ],
        escalation_trigger=trigger,
        ml_prediction=ml_prediction,
        node_trace=node_trace,
    )
    data.RECOMMENDATIONS[recommendation.id] = recommendation
    return recommendation


def _ml_sentence(ml_prediction) -> str:
    if not ml_prediction:
        return ""
    return (
        f" The trained model adds {int(ml_prediction.failure_probability * 100)}% failure probability "
        f"with top signals {', '.join(ml_prediction.top_signals) or 'not available'}."
    )


def _diagnosis(equipment_id: str, reading, risk_level: str, ml_prediction=None) -> str:
    if equipment_id == "rm-motor-01":
        return (
            f"{risk_level.title()} thermal-vibration event on the rolling mill drive motor. "
            f"The latest reading shows {reading.metrics['temperature_c']} C, "
            f"{reading.metrics['vibration_mm_s']} mm/s vibration, and {reading.metrics['current_a']} A, "
            "derived from AI4I torque, speed, temperature, and wear telemetry; it matches a bearing lubrication or coupling misalignment pattern."
            f"{_ml_sentence(ml_prediction)}"
        )
    if equipment_id == "bf-pump-07":
        return (
            f"{risk_level.title()} cooling-flow degradation on pump P-7. "
            f"Flow is {reading.metrics['flow_m3_h']} m3/h with pressure at {reading.metrics['pressure_bar']} bar, "
            "derived from AI4I torque/speed imbalance; it suggests suction restriction, air ingress, or cavitation."
            f"{_ml_sentence(ml_prediction)}"
        )
    return (
        f"{risk_level.title()} gearbox oil contamination trend. "
        f"Particle count is {reading.metrics['oil_particles_ppm']} ppm with vibration at {reading.metrics['vibration_mm_s']} mm/s, "
        "derived from AI4I tool-wear and overstrain signals; it suggests contamination ingress and possible early wear."
        f"{_ml_sentence(ml_prediction)}"
    )


def build_report_markdown(recommendation: Recommendation) -> str:
    equipment = data.EQUIPMENT[recommendation.equipment_id]
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    evidence_lines = "\n".join(f"- {item.title}: {item.excerpt}" for item in recommendation.evidence)
    immediate_lines = "\n".join(f"- {item}" for item in recommendation.immediate_actions)
    long_term_lines = "\n".join(f"- {item}" for item in recommendation.long_term_actions)
    spare_lines = "\n".join(f"- {item}" for item in recommendation.spare_strategy)
    cause_lines = "\n".join(f"- {item}" for item in recommendation.probable_root_causes)
    defect_lines = "\n".join(
        f"- {item.defect_type.replace('_', ' ').title()} ({item.severity}, {int(item.confidence * 100)}%): {item.explanation} Action: {item.recommended_action}"
        for item in recommendation.process_defects
    ) or "- No specific steel process defect rule fired."
    if recommendation.ml_prediction:
        ml_lines = (
            f"Model: {recommendation.ml_prediction.model_name}\n"
            f"Failure Probability: {int(recommendation.ml_prediction.failure_probability * 100)}%\n"
            f"Predicted Failure Mode: {recommendation.ml_prediction.predicted_failure_mode.replace('_', ' ')}\n"
            f"Top Signals: {', '.join(recommendation.ml_prediction.top_signals)}\n"
            f"Validation Accuracy/F1: {int(recommendation.ml_prediction.validation_accuracy * 100)}% / "
            f"{int(recommendation.ml_prediction.validation_f1 * 100)}%"
        )
    else:
        ml_lines = "Model prediction was unavailable; rule-based scoring was used."
    return f"""# Maintenance Decision Report

Generated: {generated}

Equipment: {equipment.name}
Area: {equipment.area}
Risk: {recommendation.risk_level.title()}
Urgency: {recommendation.urgency}
RUL Estimate: {recommendation.rul_estimate.hours} hours
Confidence: {int(recommendation.confidence * 100)}%

## Diagnosis
{recommendation.diagnosis}

## Probable Root Causes
{cause_lines}

## Immediate Actions
{immediate_lines}

## Long-Term Monitoring
{long_term_lines}

## Spare Strategy
{spare_lines}

## Process Defect Signals
{defect_lines}

## ML Prediction
{ml_lines}

## Evidence
{evidence_lines}

## Escalation Trigger
{recommendation.escalation_trigger}
"""
