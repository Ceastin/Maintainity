from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


RiskLevel = Literal["low", "medium", "high", "critical"]
Urgency = Literal["monitor", "schedule", "urgent", "shutdown_window"]
UserRole = Literal["maintenance_engineer", "supervisor", "stores"]
ChatRole = Literal["user", "assistant"]


class Equipment(BaseModel):
    id: str
    name: str
    area: str
    asset_type: str
    criticality: float = Field(ge=0, le=1)
    status: RiskLevel
    description: str
    thresholds: dict[str, dict[str, float]]


class SensorReading(BaseModel):
    equipment_id: str
    timestamp: datetime
    metrics: dict[str, float]


class Alert(BaseModel):
    id: str
    equipment_id: str
    timestamp: datetime
    severity: RiskLevel
    message: str
    signal: str
    value: float
    acknowledged: bool = False


class SparePart(BaseModel):
    id: str
    equipment_id: str
    name: str
    stock: int
    lead_time_days: int
    supplier: str
    critical: bool = True


class MaintenanceLog(BaseModel):
    id: str
    equipment_id: str
    timestamp: datetime
    title: str
    summary: str
    downtime_minutes: int
    root_cause: str
    action_taken: str


class DocumentChunk(BaseModel):
    id: str
    equipment_id: str
    source_type: Literal[
        "manual",
        "sop",
        "failure_report",
        "maintenance_log",
        "feedback",
        "fault_event",
        "incident_record",
        "breakdown_summary",
        "delay_log",
        "abnormality_alert",
        "spare_part",
    ]
    title: str
    section: str
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class Evidence(BaseModel):
    source_id: str
    source_type: str
    title: str
    excerpt: str
    relevance: float = Field(ge=0, le=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ProcessDefect(BaseModel):
    id: str
    equipment_id: str
    defect_type: str
    severity: RiskLevel
    confidence: float = Field(ge=0, le=1)
    signals: list[str]
    explanation: str
    recommended_action: str


class RulEstimate(BaseModel):
    hours: int
    confidence: float = Field(ge=0, le=1)
    degradation_score: float = Field(ge=0, le=1)


class MlPrediction(BaseModel):
    model_name: str
    model_version: str
    trained_at: datetime
    failure_probability: float = Field(ge=0, le=1)
    failure_likely: bool
    predicted_failure_mode: str
    failure_mode_confidence: float = Field(ge=0, le=1)
    top_signals: list[str]
    threshold: float = Field(ge=0, le=1)
    validation_accuracy: float = Field(ge=0, le=1)
    validation_precision: float = Field(ge=0, le=1)
    validation_recall: float = Field(ge=0, le=1)
    validation_f1: float = Field(ge=0, le=1)
    validation_average_precision: float = Field(ge=0, le=1)


class Recommendation(BaseModel):
    id: str
    equipment_id: str
    alert_id: str | None = None
    diagnosis: str
    probable_root_causes: list[str]
    risk_level: RiskLevel
    urgency: Urgency
    rul_estimate: RulEstimate
    evidence: list[Evidence]
    immediate_actions: list[str]
    long_term_actions: list[str]
    spare_strategy: list[str]
    process_defects: list[ProcessDefect] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)
    assumptions: list[str]
    escalation_trigger: str
    ml_prediction: MlPrediction | None = None
    node_trace: list[dict[str, Any]] = Field(default_factory=list)


class HealthMetric(BaseModel):
    name: str
    value: float
    unit: str
    status: RiskLevel
    threshold: str


class MlTrendPoint(BaseModel):
    timestamp: datetime
    failure_probability: float = Field(ge=0, le=1)
    threshold: float = Field(ge=0, le=1)
    failure_likely: bool


class EquipmentHealth(BaseModel):
    equipment: Equipment
    latest_reading: SensorReading
    metrics: list[HealthMetric]
    anomaly_score: float
    priority_score: float
    risk_level: RiskLevel
    urgency: Urgency
    rul_estimate: RulEstimate
    ml_prediction: MlPrediction | None = None
    alerts: list[Alert]
    trend: list[SensorReading]
    ml_trend: list[MlTrendPoint]
    spares: list[SparePart]
    process_defects: list[ProcessDefect] = Field(default_factory=list)


class Notification(BaseModel):
    id: str
    role: UserRole
    equipment_id: str
    alert_id: str | None = None
    severity: RiskLevel
    title: str
    message: str
    action: str
    timestamp: datetime


class ChatTurn(BaseModel):
    conversation_id: str
    role: ChatRole
    message: str
    timestamp: datetime
    equipment_id: str | None = None
    recommendation_id: str | None = None


class IngestDocumentRequest(BaseModel):
    equipment_id: str
    source_type: Literal["manual", "sop", "failure_report", "incident_record", "breakdown_summary"]
    title: str
    text: str
    section: str = "Uploaded"


class IngestLogsRequest(BaseModel):
    logs: list[MaintenanceLog]


class FaultEvent(BaseModel):
    id: str | None = None
    equipment_id: str
    timestamp: datetime
    source_system: str = "control_system"
    code: str | None = None
    severity: RiskLevel = "medium"
    message: str
    signal: str | None = None
    value: float | None = None
    recommended_action: str | None = None


class IngestFaultEventsRequest(BaseModel):
    events: list[FaultEvent]


class AlertInput(BaseModel):
    id: str | None = None
    equipment_id: str
    timestamp: datetime
    severity: RiskLevel
    message: str
    signal: str
    value: float
    acknowledged: bool = False


class IngestAlertsRequest(BaseModel):
    alerts: list[AlertInput]


class IngestSparesRequest(BaseModel):
    spares: list[SparePart]


class SensorBatchRequest(BaseModel):
    readings: list[SensorReading]


class RecommendationRequest(BaseModel):
    equipment_id: str
    query: str = "Diagnose this alert and propose the safest maintenance plan."
    alert_id: str | None = None


class ChatRequest(BaseModel):
    message: str
    equipment_id: str | None = None
    alert_id: str | None = None
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    conversation_id: str
    message: str
    recommendation: Recommendation


class FeedbackRequest(BaseModel):
    recommendation_id: str
    equipment_id: str
    rating: Literal["accepted", "corrected", "rejected"]
    actual_root_cause: str | None = None
    action_taken: str | None = None
    downtime_saved_minutes: int = 0
    note: str | None = None


class FeedbackRecord(FeedbackRequest):
    id: str
    timestamp: datetime


class ReportRequest(BaseModel):
    equipment_id: str
    recommendation_id: str | None = None


class ReportResponse(BaseModel):
    id: str
    equipment_id: str
    generated_at: datetime
    title: str
    markdown: str
    recommendation: Recommendation


class PlantSummary(BaseModel):
    equipment_count: int
    open_alert_count: int
    critical_alert_count: int
    average_rul_hours: int
    highest_priority: float
    dataset_rows_loaded: int = 0
    stream_step: int = 0
