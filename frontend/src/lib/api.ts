import type {
  Alert,
  ChatResponse,
  DatasetStatus,
  Equipment,
  EquipmentHealth,
  FeedbackPayload,
  IngestAlertsPayload,
  IngestDocumentPayload,
  IngestFaultEventsPayload,
  IngestLogsPayload,
  IngestSparesPayload,
  PlantSummary,
  Recommendation,
  ReportResponse,
  RoleNotification,
  RoleOption,
  SensorBatchPayload,
  UserRole
} from "./types"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      }
    })
  } catch {
    throw new Error(`Backend is not reachable at ${API_BASE}. Start the FastAPI server and refresh the dashboard.`)
  }

  if (!response.ok) {
    const text = await response.text()
    let message = text || `Request failed: ${response.status}`
    try {
      const payload = JSON.parse(text) as { detail?: string }
      message = payload.detail ?? message
    } catch {
      // Keep the raw server response when it is not JSON.
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export const api = {
  healthz: () =>
    request<{
      status: string
      service: string
      openai: boolean
      rag?: {
        provider: string
        preferred_provider: string
        embedding_model: string
        openai_available: boolean
      }
      ml?: {
        available: boolean
        model_name?: string
        model_version?: string
        validation_accuracy?: number
        validation_precision?: number
        validation_recall?: number
        validation_f1?: number
        validation_average_precision?: number
        threshold?: number
      }
    }>("/healthz"),
  summary: () => request<PlantSummary>("/summary"),
  roles: () => request<RoleOption[]>("/roles"),
  notifications: (role: UserRole) => request<RoleNotification[]>(`/notifications/${role}`),
  dataset: () => request<DatasetStatus>("/dataset"),
  tick: (steps = 1) => request<DatasetStatus>(`/stream/tick?steps=${steps}`, { method: "POST" }),
  equipment: () => request<Equipment[]>("/equipment"),
  health: (equipmentId: string) => request<EquipmentHealth>(`/equipment/${equipmentId}/health`),
  alerts: () => request<Alert[]>("/alerts"),
  recommendation: (equipmentId: string, alertId?: string) =>
    request<Recommendation>("/recommendations", {
      method: "POST",
      body: JSON.stringify({
        equipment_id: equipmentId,
        alert_id: alertId,
        query: "Diagnose the current alert, prioritize maintenance, and cite evidence."
      })
    }),
  chat: (message: string, equipmentId?: string, alertId?: string, conversationId?: string) =>
    request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        equipment_id: equipmentId,
        alert_id: alertId,
        conversation_id: conversationId
      })
    }),
  feedback: (payload: FeedbackPayload) =>
    request("/feedback", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  report: (equipmentId: string, recommendationId?: string) =>
    request<ReportResponse>("/reports", {
      method: "POST",
      body: JSON.stringify({
        equipment_id: equipmentId,
        recommendation_id: recommendationId
      })
    }),
  ingestDocument: (payload: IngestDocumentPayload) =>
    request<{ ingested_chunks: number }>("/ingest/documents", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  ingestLogs: (payload: IngestLogsPayload) =>
    request<{ ingested_logs: number }>("/ingest/logs", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  ingestFaultEvents: (payload: IngestFaultEventsPayload) =>
    request<{ ingested_events: number; alerts_created: number }>("/ingest/fault-events", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  ingestAlerts: (payload: IngestAlertsPayload) =>
    request<{ ingested_alerts: number }>("/ingest/alerts", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  ingestSpares: (payload: IngestSparesPayload) =>
    request<{ ingested_spares: number }>("/ingest/spares", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  ingestSensorBatch: (payload: SensorBatchPayload) =>
    request<{ ingested_readings: number }>("/ingest/sensor-batch", {
      method: "POST",
      body: JSON.stringify(payload)
    })
}
