from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import data
from .agent import build_report_markdown, generate_recommendation, infer_equipment_id, latest_reading
from .defects import detect_process_defects
from .models import (
    Alert,
    ChatRequest,
    ChatResponse,
    DocumentChunk,
    EquipmentHealth,
    FeedbackRecord,
    FeedbackRequest,
    IngestAlertsRequest,
    IngestDocumentRequest,
    IngestFaultEventsRequest,
    IngestLogsRequest,
    IngestSparesRequest,
    PlantSummary,
    RecommendationRequest,
    ReportRequest,
    ReportResponse,
    SensorBatchRequest,
    UserRole,
)
from .notifications import available_roles, notifications_for_role
from .ml_model import model_status, predict_failure, predict_failure_trend
from .openai_client import generate_copilot_reply, openai_available
from .rag import add_document, rag_status, search_evidence
from .scoring import (
    build_health_metrics,
    compute_anomaly_score,
    compute_priority_score,
    estimate_rul,
    risk_from_priority,
    urgency_from_risk,
)


app = FastAPI(
    title="SteelGuard AI Maintenance Wizard",
    description="Hackathon prototype for explainable steel plant maintenance decisions.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz():
    return {
        "status": "ok",
        "service": "steelguard-api",
        "openai": openai_available(),
        "rag": rag_status(),
        "ml": model_status(),
    }


@app.get("/ml/status")
def ml_status():
    return model_status()


@app.get("/dataset")
def dataset_status():
    return data.dataset_status()


@app.post("/stream/tick")
def stream_tick(steps: int = 1):
    return data.advance_stream(steps)


@app.get("/summary", response_model=PlantSummary)
def plant_summary():
    health = [equipment_health(equipment_id) for equipment_id in data.EQUIPMENT]
    dataset = data.dataset_status()
    return PlantSummary(
        equipment_count=len(data.EQUIPMENT),
        open_alert_count=len([alert for alert in data.ALERTS.values() if not alert.acknowledged]),
        critical_alert_count=len([alert for alert in data.ALERTS.values() if alert.severity == "critical"]),
        average_rul_hours=int(sum(item.rul_estimate.hours for item in health) / len(health)),
        highest_priority=max(item.priority_score for item in health),
        dataset_rows_loaded=dataset["rows_loaded"],
        stream_step=dataset["stream_step"],
    )


@app.get("/equipment")
def list_equipment():
    return list(data.EQUIPMENT.values())


@app.get("/equipment/{equipment_id}/health", response_model=EquipmentHealth)
def equipment_health(equipment_id: str):
    equipment = data.EQUIPMENT.get(equipment_id)
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    reading = latest_reading(equipment_id)
    trend = sorted([reading for reading in data.SENSOR_READINGS if reading.equipment_id == equipment_id], key=lambda item: item.timestamp)
    anomaly = compute_anomaly_score(equipment, reading)
    spare_pressure = _spare_pressure(equipment_id)
    ml_prediction = predict_failure(equipment, reading)
    priority = compute_priority_score(
        equipment,
        reading,
        anomaly,
        spare_pressure,
        ml_prediction.failure_probability if ml_prediction else 0.0,
    )
    risk = risk_from_priority(priority)
    rul = estimate_rul(equipment, reading, anomaly)
    process_defects = detect_process_defects(equipment, reading, anomaly)
    return EquipmentHealth(
        equipment=equipment.model_copy(update={"status": risk}),
        latest_reading=reading,
        metrics=build_health_metrics(equipment, reading),
        anomaly_score=anomaly,
        priority_score=priority,
        risk_level=risk,  # type: ignore[arg-type]
        urgency=urgency_from_risk(risk, rul.hours),  # type: ignore[arg-type]
        rul_estimate=rul,
        ml_prediction=ml_prediction,
        alerts=[alert for alert in data.ALERTS.values() if alert.equipment_id == equipment_id],
        trend=trend,
        ml_trend=_failure_probability_trend(equipment, trend),
        spares=[part for part in data.SPARES if part.equipment_id == equipment_id],
        process_defects=process_defects,
    )


@app.get("/alerts")
def list_alerts():
    return sorted(data.ALERTS.values(), key=lambda alert: alert.timestamp, reverse=True)


@app.get("/roles")
def list_roles():
    return available_roles()


@app.get("/notifications/{role}")
def role_notifications(role: UserRole):
    return notifications_for_role(role)


@app.get("/rag/evidence/{equipment_id}")
def rag_evidence(equipment_id: str, q: str = ""):
    equipment = data.EQUIPMENT.get(equipment_id)
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    query = q or f"{equipment.name} {equipment.description}"
    return search_evidence(equipment_id, query, limit=6)


@app.post("/ingest/documents")
def ingest_documents(payload: IngestDocumentRequest):
    if payload.equipment_id not in data.EQUIPMENT:
        raise HTTPException(status_code=404, detail="Equipment not found")
    chunks = add_document(payload.equipment_id, payload.source_type, payload.title, payload.section, payload.text)
    return {"ingested_chunks": len(chunks), "chunks": chunks}


@app.post("/ingest/logs")
def ingest_logs(payload: IngestLogsRequest):
    known = set(data.EQUIPMENT)
    for log in payload.logs:
        if log.equipment_id not in known:
            raise HTTPException(status_code=404, detail=f"Equipment not found: {log.equipment_id}")
    data.MAINTENANCE_LOGS.extend(payload.logs)
    return {"ingested_logs": len(payload.logs)}


@app.post("/ingest/fault-events")
def ingest_fault_events(payload: IngestFaultEventsRequest):
    known = set(data.EQUIPMENT)
    chunks: list[DocumentChunk] = []
    created_alerts: list[Alert] = []
    for event in payload.events:
        if event.equipment_id not in known:
            raise HTTPException(status_code=404, detail=f"Equipment not found: {event.equipment_id}")
        event_id = event.id or f"fault-{uuid4().hex[:10]}"
        signal = event.signal or event.code or "fault_event"
        text = " ".join(
            part
            for part in [
                f"Fault or error message from {event.source_system}.",
                f"Code: {event.code}." if event.code else "",
                f"Severity: {event.severity}.",
                f"Message: {event.message}.",
                f"Signal {event.signal} value {event.value}." if event.signal else "",
                f"Recommended action: {event.recommended_action}." if event.recommended_action else "",
            ]
            if part
        )
        chunk = DocumentChunk(
            id=event_id,
            equipment_id=event.equipment_id,
            source_type="fault_event",
            title=f"Fault event {event.code or event_id}",
            section="Control-system fault",
            text=text,
            metadata={
                "timestamp": event.timestamp.isoformat(),
                "source_system": event.source_system,
                "code": event.code or "",
                "severity": event.severity,
            },
        )
        data.DOCUMENTS.append(chunk)
        chunks.append(chunk)
        if event.severity in {"high", "critical"}:
            alert = Alert(
                id=f"alert-{event_id}",
                equipment_id=event.equipment_id,
                timestamp=event.timestamp,
                severity=event.severity,
                message=event.message,
                signal=signal,
                value=event.value or 0.0,
            )
            data.ALERTS[alert.id] = alert
            created_alerts.append(alert)
    return {"ingested_events": len(payload.events), "chunks": chunks, "alerts_created": len(created_alerts), "alerts": created_alerts}


@app.post("/ingest/alerts")
def ingest_alerts(payload: IngestAlertsRequest):
    known = set(data.EQUIPMENT)
    alerts: list[Alert] = []
    chunks: list[DocumentChunk] = []
    for item in payload.alerts:
        if item.equipment_id not in known:
            raise HTTPException(status_code=404, detail=f"Equipment not found: {item.equipment_id}")
        alert = Alert(
            id=item.id or f"alert-ui-{uuid4().hex[:10]}",
            equipment_id=item.equipment_id,
            timestamp=item.timestamp,
            severity=item.severity,
            message=item.message,
            signal=item.signal,
            value=item.value,
            acknowledged=item.acknowledged,
        )
        data.ALERTS[alert.id] = alert
        alerts.append(alert)
        chunk = DocumentChunk(
            id=f"alert-doc-{alert.id}",
            equipment_id=alert.equipment_id,
            source_type="abnormality_alert",
            title=f"{alert.severity.title()} abnormality alert",
            section="Alert stream",
            text=f"Abnormality alert: {alert.message}. Signal {alert.signal} measured {alert.value}.",
            metadata={
                "alert_id": alert.id,
                "timestamp": alert.timestamp.isoformat(),
                "severity": alert.severity,
                "acknowledged": alert.acknowledged,
            },
        )
        data.DOCUMENTS.append(chunk)
        chunks.append(chunk)
    return {"ingested_alerts": len(alerts), "alerts": alerts, "chunks": chunks}


@app.post("/ingest/spares")
def ingest_spares(payload: IngestSparesRequest):
    known = set(data.EQUIPMENT)
    chunks: list[DocumentChunk] = []
    for part in payload.spares:
        if part.equipment_id not in known:
            raise HTTPException(status_code=404, detail=f"Equipment not found: {part.equipment_id}")
        for index, existing in enumerate(data.SPARES):
            if existing.id == part.id:
                data.SPARES[index] = part
                break
        else:
            data.SPARES.append(part)
        chunk_id = f"spare-{part.id}"
        data.DOCUMENTS[:] = [chunk for chunk in data.DOCUMENTS if chunk.id != chunk_id]
        chunk = DocumentChunk(
            id=chunk_id,
            equipment_id=part.equipment_id,
            source_type="spare_part",
            title=f"Spare part availability: {part.name}",
            section="Stores inventory",
            text=(
                f"Spare part {part.name} has stock {part.stock}, procurement lead time {part.lead_time_days} days, "
                f"supplier {part.supplier}, and critical flag {part.critical}."
            ),
            metadata={
                "spare_id": part.id,
                "stock": part.stock,
                "lead_time_days": part.lead_time_days,
                "supplier": part.supplier,
                "critical": part.critical,
            },
        )
        data.DOCUMENTS.append(chunk)
        chunks.append(chunk)
    return {"ingested_spares": len(payload.spares), "spares": payload.spares, "chunks": chunks}


@app.post("/ingest/sensor-batch")
def ingest_sensor_batch(payload: SensorBatchRequest):
    known = set(data.EQUIPMENT)
    for reading in payload.readings:
        if reading.equipment_id not in known:
            raise HTTPException(status_code=404, detail=f"Equipment not found: {reading.equipment_id}")
    data.SENSOR_READINGS.extend(payload.readings)
    return {"ingested_readings": len(payload.readings)}


@app.post("/recommendations")
def create_recommendation(payload: RecommendationRequest):
    try:
        return generate_recommendation(payload.equipment_id, payload.query, payload.alert_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
    conversation_id = payload.conversation_id or f"conv-{uuid4().hex[:8]}"
    equipment_id = payload.equipment_id or infer_equipment_id(payload.message)
    history = data.conversation_context(conversation_id)
    history_lines = [f"{turn.role}: {turn.message}" for turn in history]
    query = payload.message
    if history_lines:
        query = "Recent conversation:\n" + "\n".join(history_lines[-8:]) + f"\nCurrent question: {payload.message}"
    data.remember_chat_turn(conversation_id, "user", payload.message, equipment_id=equipment_id)
    recommendation = generate_recommendation(equipment_id, query, payload.alert_id)
    if history_lines:
        recommendation.node_trace.append(
            {
                "node": "chat_memory",
                "status": "complete",
                "summary": f"Used {len(history_lines)} prior conversation turns for context.",
            }
        )
    feedback_note = " It also used prior engineer feedback." if any(item.source_type == "feedback" for item in recommendation.evidence) else ""
    fallback_message = (
        f"{recommendation.diagnosis} Recommended urgency is {recommendation.urgency}; "
        f"estimated RUL is {recommendation.rul_estimate.hours} hours with {int(recommendation.confidence * 100)}% confidence."
        f"{feedback_note}"
    )
    llm_message = generate_copilot_reply(payload.message, recommendation, history_lines)
    if llm_message:
        recommendation.node_trace.append(
            {"node": "openai_copilot", "status": "complete", "summary": "Generated chat response with the OpenAI Responses API."}
        )
    else:
        recommendation.node_trace.append(
            {"node": "openai_copilot", "status": "fallback", "summary": "OpenAI API key unavailable or request failed; used structured backend response."}
        )
    response_message = llm_message or fallback_message
    data.remember_chat_turn(
        conversation_id,
        "assistant",
        response_message,
        equipment_id=equipment_id,
        recommendation_id=recommendation.id,
    )
    return ChatResponse(
        conversation_id=conversation_id,
        message=response_message,
        recommendation=recommendation,
    )


@app.get("/chat/history/{conversation_id}")
def chat_history(conversation_id: str):
    return data.conversation_context(conversation_id, limit=18)


@app.post("/feedback", response_model=FeedbackRecord)
def add_feedback(payload: FeedbackRequest):
    if payload.recommendation_id not in data.RECOMMENDATIONS:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    record = FeedbackRecord(
        **payload.model_dump(),
        id=f"fb-{uuid4().hex[:10]}",
        timestamp=datetime.now(timezone.utc),
    )
    data.FEEDBACK.append(record)
    data.persist_feedback()
    return record


@app.post("/reports", response_model=ReportResponse)
def create_report(payload: ReportRequest):
    if payload.recommendation_id:
        recommendation = data.RECOMMENDATIONS.get(payload.recommendation_id)
        if not recommendation:
            raise HTTPException(status_code=404, detail="Recommendation not found")
    else:
        recommendation = generate_recommendation(payload.equipment_id, "Generate maintenance decision report.")
    if recommendation.equipment_id != payload.equipment_id:
        raise HTTPException(status_code=400, detail="Recommendation does not match equipment")
    return ReportResponse(
        id=f"report-{uuid4().hex[:10]}",
        equipment_id=payload.equipment_id,
        generated_at=datetime.now(timezone.utc),
        title="Maintenance Decision Report",
        markdown=build_report_markdown(recommendation),
        recommendation=recommendation,
    )


def _failure_probability_trend(equipment, trend):
    return predict_failure_trend(equipment, trend)


def _spare_pressure(equipment_id: str) -> float:
    parts = [part for part in data.SPARES if part.equipment_id == equipment_id and part.critical]
    if not parts:
        return 0.0
    pressure = 0.0
    for part in parts:
        stock_pressure = 1.0 if part.stock == 0 else 0.25 if part.stock == 1 else 0.0
        pressure = max(pressure, stock_pressure * 0.7 + min(1.0, part.lead_time_days / 30) * 0.3)
    return round(pressure, 2)
