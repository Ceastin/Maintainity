export type RiskLevel = "critical" | "high" | "medium" | "low"
export type Urgency = "immediate" | "next_shift" | "routine" | "watch"
export type UserRole =
  | "maintenance_engineer"
  | "plant_manager"
  | "safety_officer"
  | " reliability_engineer"
  | "operator"

export interface Equipment {
  id: string;
  name: string;
  area: string;
  asset_type: string;
  criticality: number;
  status: RiskLevel;
  description: string;
  thresholds: Record<string, Record<string, number>>;
}

export interface SensorReading {
  equipment_id: string;
  timestamp: string;
  metrics: Record<string, number>;
}

export interface Alert {
  id: string;
  equipment_id: string;
  timestamp: string;
  severity: RiskLevel;
  message: string;
  signal: string;
  value: number;
  acknowledged: boolean;
}

export interface SparePart {
  id: string;
  equipment_id: string;
  name: string;
  stock: number;
  lead_time_days: number;
  supplier: string;
  critical: boolean;
}

export interface Evidence {
  source_id: string;
  source_type: string;
  title: string;
  excerpt: string;
  relevance: number;
  metadata: Record<string, unknown>;
}

export interface ProcessDefect {
  id: string;
  equipment_id: string;
  defect_type: string;
  severity: RiskLevel;
  confidence: number;
  signals: string[];
  explanation: string;
  recommended_action: string;
}

export interface RulEstimate {
  hours: number;
  confidence: number;
  degradation_score: number;
}

export interface MlPrediction {
  model_name: string;
  model_version: string;
  trained_at: string;
  failure_probability: number;
  failure_likely: boolean;
  predicted_failure_mode: string;
  failure_mode_confidence: number;
  top_signals: string[];
  threshold: number;
  validation_accuracy: number;
  validation_precision: number;
  validation_recall: number;
  validation_f1: number;
  validation_average_precision: number;
}

export interface MlTrendPoint {
  timestamp: string;
  failure_probability: number;
  threshold: number;
  failure_likely: boolean;
}

export interface Recommendation {
  id: string;
  equipment_id: string;
  alert_id?: string | null;
  diagnosis: string;
  probable_root_causes: string[];
  risk_level: RiskLevel;
  urgency: Urgency;
  rul_estimate: RulEstimate;
  evidence: Evidence[];
  immediate_actions: string[];
  long_term_actions: string[];
  spare_strategy: string[];
  process_defects: ProcessDefect[];
  confidence: number;
  assumptions: string[];
  escalation_trigger: string;
  ml_prediction?: MlPrediction | null;
  node_trace: Array<Record<string, string | number>>;
}

export interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  status: RiskLevel;
  threshold: string;
}

export interface EquipmentHealth {
  equipment: Equipment;
  latest_reading: SensorReading;
  metrics: HealthMetric[];
  anomaly_score: number;
  priority_score: number;
  risk_level: RiskLevel;
  urgency: Urgency;
  rul_estimate: RulEstimate;
  ml_prediction?: MlPrediction | null;
  alerts: Alert[];
  trend: SensorReading[];
  ml_trend: MlTrendPoint[];
  spares: SparePart[];
  process_defects: ProcessDefect[];
}

export interface PlantSummary {
  equipment_count: number;
  open_alert_count: number;
  critical_alert_count: number;
  average_rul_hours: number;
  highest_priority: number;
  dataset_rows_loaded: number;
  stream_step: number;
}

export interface DatasetStatus {
  source: string;
  source_url: string;
  rows_loaded: number;
  failure_rows_loaded: number;
  stream_step: number;
  equipment_mappings: number;
  latest_uids: Record<string, number>;
}

export interface ChatResponse {
  conversation_id: string;
  message: string;
  recommendation: Recommendation;
}

export interface ReportResponse {
  id: string;
  equipment_id: string;
  generated_at: string;
  title: string;
  markdown: string;
  recommendation: Recommendation;
}

export interface RoleOption {
  id: UserRole;
  label: string;
}

export interface RoleNotification {
  id: string;
  role: UserRole;
  equipment_id: string;
  alert_id?: string | null;
  severity: RiskLevel;
  title: string;
  message: string;
  action: string;
  timestamp: string;
}

export type FeedbackRating = "accepted" | "corrected" | "rejected";

export interface FeedbackPayload {
  recommendation_id: string;
  equipment_id: string;
  rating: FeedbackRating;
  actual_root_cause?: string;
  action_taken?: string;
  downtime_saved_minutes?: number;
  note?: string;
}

export interface IngestDocumentPayload {
  equipment_id: string;
  source_type: "manual" | "sop" | "failure_report" | "incident_record" | "breakdown_summary";
  title: string;
  section: string;
  text: string;
}

export interface IngestLogsPayload {
  logs: Array<{
    id: string;
    equipment_id: string;
    timestamp: string;
    title: string;
    summary: string;
    downtime_minutes: number;
    root_cause: string;
    action_taken: string;
  }>;
}

export interface SensorBatchPayload {
  readings: SensorReading[];
}

export interface IngestFaultEventsPayload {
  events: Array<{
    id?: string;
    equipment_id: string;
    timestamp: string;
    source_system: string;
    code?: string;
    severity: RiskLevel;
    message: string;
    signal?: string;
    value?: number;
    recommended_action?: string;
  }>;
}

export interface IngestAlertsPayload {
  alerts: Array<{
    id?: string;
    equipment_id: string;
    timestamp: string;
    severity: RiskLevel;
    message: string;
    signal: string;
    value: number;
    acknowledged?: boolean;
  }>;
}

export interface IngestSparesPayload {
  spares: SparePart[];
}