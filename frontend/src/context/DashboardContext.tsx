import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from "react"
import { api } from "@/lib/api"
import type {
  Alert,
  ChatResponse,
  DatasetStatus,
  Equipment,
  EquipmentHealth,
  FeedbackPayload,
  PlantSummary,
  Recommendation,
  ReportResponse,
  RoleNotification,
  RoleOption,
  UserRole
} from "@/lib/types"

type ApiStatus = "checking" | "online" | "offline"

interface DashboardState {
  summary: PlantSummary
  equipment: Equipment[]
  alerts: Alert[]
  dataset: DatasetStatus | null
  selectedId: string | null
  healthMap: Record<string, EquipmentHealth>
  recommendation: Recommendation | null
  report: ReportResponse | null
  conversationId: string | undefined
  busy: boolean
  error: string | null
  notice: string | null
  live: boolean
  apiStatus: ApiStatus
  roles: RoleOption[]
  selectedRole: UserRole
  notifications: RoleNotification[]
  notificationsUpdatedAt: string | null
  openaiEnabled: boolean
  ragProvider: string
  mlModelLabel: string
  initialLoading: boolean
  hydrationProgress: number
  hydrationStatus: string
  selectedHealth: EquipmentHealth | null
  selectedAlert: Alert | undefined
  selectedEquipment: Equipment | null
  selectedEquipmentName: string
}

interface DashboardActions {
  setSelectedId: (id: string | null) => void
  setLive: (live: boolean | ((prev: boolean) => boolean)) => void
  setSelectedRole: (role: UserRole) => void
  setError: (error: string | null) => void
  setNotice: (notice: string | null) => void
  setReport: (report: ReportResponse | null) => void
  loadDashboard: () => Promise<void>
  advanceStream: () => Promise<void>
  loadNotifications: (role: UserRole) => Promise<void>
  sendChat: (message: string) => Promise<ChatResponse>
  startNewChat: () => void
  generateReport: () => Promise<void>
  recordFeedback: (payload: FeedbackPayload) => Promise<void>
}

const emptySummary: PlantSummary = {
  equipment_count: 0,
  open_alert_count: 0,
  critical_alert_count: 0,
  average_rul_hours: 0,
  highest_priority: 0,
  dataset_rows_loaded: 0,
  stream_step: 0
}

const DashboardContext = createContext<(DashboardState & DashboardActions) | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<PlantSummary>(emptySummary)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [dataset, setDataset] = useState<DatasetStatus | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [healthMap, setHealthMap] = useState<Record<string, EquipmentHealth>>({})
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [report, setReport] = useState<ReportResponse | null>(null)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [live, setLive] = useState(true)
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking")
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [selectedRole, setSelectedRole] = useState<UserRole>("maintenance_engineer")
  const [notifications, setNotifications] = useState<RoleNotification[]>([])
  const [notificationsUpdatedAt, setNotificationsUpdatedAt] = useState<string | null>(null)
  const [openaiEnabled, setOpenaiEnabled] = useState(false)
  const [ragProvider, setRagProvider] = useState("checking")
  const [mlModelLabel, setMlModelLabel] = useState("checking")
  const [initialLoading, setInitialLoading] = useState(true)
  const [hydrationProgress, setHydrationProgress] = useState(0)
  const [hydrationStatus, setHydrationStatus] = useState("Initializing database handshake...")

  const feedbackLockedRef = useRef(false)
  const lockFeedback = useCallback(() => { feedbackLockedRef.current = true }, [])
  const unlockFeedback = useCallback(() => { feedbackLockedRef.current = false }, [])

  const loadDashboard = useCallback(async () => {
    setBusy(true)
    setError(null)
    setApiStatus("checking")
    setHydrationProgress(5)
    setHydrationStatus("Pinging FastAPI backend server...")
    try {
      const healthPayload = await api.healthz()
      setHydrationProgress(25)
      setHydrationStatus("Retrieving plant summary & equipment status...")
      const [summaryPayload, equipmentPayload, alertPayload, datasetPayload] = await Promise.all([
        api.summary(),
        api.equipment(),
        api.alerts(),
        api.dataset()
      ])
      setHydrationProgress(55)
      setHydrationStatus("Loading user roles & notifications archive...")
      const [rolesPayload, notificationPayload] = await Promise.all([
        api.roles(),
        api.notifications(selectedRole)
      ])
      setHydrationProgress(75)
      setHydrationStatus(`Evaluating individual health indicators for ${equipmentPayload.length} assets...`)
      const healthEntries = await Promise.all(
        equipmentPayload.map(async (item) => [item.id, await api.health(item.id)] as const)
      )
      setHydrationProgress(95)
      setHydrationStatus("Assembling interactive digital twin and telemetry charts...")

      setSummary(summaryPayload)
      setEquipment(equipmentPayload)
      setAlerts(alertPayload)
      setDataset(datasetPayload)
      setRoles(rolesPayload)
      setNotifications(notificationPayload)
      setNotificationsUpdatedAt(new Date().toISOString())
      setHealthMap(Object.fromEntries(healthEntries))
      setOpenaiEnabled(Boolean(healthPayload.openai))
      setRagProvider(healthPayload.rag?.provider?.replaceAll("_", " ") ?? "unknown")
      setMlModelLabel(healthPayload.ml?.available ? healthPayload.ml.model_name ?? "trained model" : "unavailable")
      setSelectedId((current) => {
        if (current && equipmentPayload.some((item) => item.id === current)) return current
        return alertPayload[0]?.equipment_id ?? equipmentPayload[0]?.id ?? null
      })
      setApiStatus("online")
      setHydrationProgress(100)
      setHydrationStatus("Console connection established.")
    } catch (caught) {
      setApiStatus("offline")
      setError(caught instanceof Error ? caught.message : "Unable to load Maintenance AI.")
    } finally {
      setBusy(false)
      setTimeout(() => setInitialLoading(false), 400)
    }
  }, [selectedRole])

  const advanceStream = useCallback(async () => {
    setError(null)
    try {
      const datasetPayload = await api.tick(1)
      const [summaryPayload, alertPayload, notificationPayload] = await Promise.all([
        api.summary(),
        api.alerts(),
        api.notifications(selectedRole)
      ])
      const equipmentIds = equipment.length ? equipment.map((item) => item.id) : Object.keys(healthMap)
      const healthEntries = await Promise.all(
        equipmentIds.map(async (item) => [item, await api.health(item)] as const)
      )
      setDataset(datasetPayload)
      setSummary(summaryPayload)
      setAlerts(alertPayload)
      setNotifications(notificationPayload)
      setNotificationsUpdatedAt(new Date().toISOString())
      setHealthMap((items) => ({ ...items, ...Object.fromEntries(healthEntries) }))
      if (selectedId && !feedbackLockedRef.current) {
        const selectedAlertAfterTick = alertPayload.find((item) => item.equipment_id === selectedId)
        const nextRecommendation = await api.recommendation(selectedId, selectedAlertAfterTick?.id)
        setRecommendation(nextRecommendation)
      }
      setApiStatus("online")
    } catch (caught) {
      setLive(false)
      setApiStatus("offline")
      setError(caught instanceof Error ? caught.message : "Unable to advance live stream.")
    }
  }, [equipment, healthMap, selectedId, selectedRole])

  const loadNotifications = useCallback(async (role: UserRole) => {
    try {
      const payload = await api.notifications(role)
      setNotifications(payload)
      setNotificationsUpdatedAt(new Date().toISOString())
    } catch {
      setNotifications([])
      setNotificationsUpdatedAt(new Date().toISOString())
    }
  }, [])

  const sendChat = useCallback(async (message: string) => {
    const response = await api.chat(message, selectedId ?? undefined, selectedAlert?.id, conversationId)
    setConversationId(response.conversation_id)
    setApiStatus("online")
    return response
  }, [selectedId, conversationId])

  const startNewChat = useCallback(() => {
    setConversationId(undefined)
    setNotice("Started a new copilot chat.")
  }, [])

  const generateReport = useCallback(async () => {
    if (!selectedId) return
    setBusy(true)
    setError(null)
    try {
      const payload = await api.report(selectedId, recommendation?.id)
      setReport(payload)
      setNotice("Report generated from the selected recommendation.")
      setApiStatus("online")
    } catch (caught) {
      setApiStatus("offline")
      setError(caught instanceof Error ? caught.message : "Unable to generate report.")
    } finally {
      setBusy(false)
    }
  }, [selectedId, recommendation])

  const recordFeedback = useCallback(async (payload: FeedbackPayload) => {
    if (!recommendation || !selectedId) return
    setError(null)
    try {
      await api.feedback(payload)
      setNotice(`Feedback recorded: ${payload.rating}. Future recommendations can use this outcome.`)
      setApiStatus("online")
    } catch (caught) {
      setApiStatus("offline")
      setError(caught instanceof Error ? caught.message : "Unable to record feedback.")
      throw caught
    }
  }, [recommendation, selectedId])

  // Auto-load on mount
  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  // Live stream tick
  useEffect(() => {
    if (!live) return
    const timer = window.setInterval(() => {
      if (feedbackLockedRef.current) return
      void advanceStream()
    }, 6000)
    return () => window.clearInterval(timer)
  }, [live, advanceStream])

  // Notice auto-clear
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  // Role change triggers notification reload
  useEffect(() => {
    void loadNotifications(selectedRole)
  }, [selectedRole, loadNotifications])

  const selectedHealth = selectedId ? healthMap[selectedId] : null
  const selectedAlert = useMemo(() => alerts.find((alert) => alert.equipment_id === selectedId), [alerts, selectedId])
  const selectedEquipment = selectedHealth?.equipment ?? equipment.find((item) => item.id === selectedId) ?? null
  const selectedEquipmentName = selectedEquipment?.name ?? "Select equipment"

  const value = {
    summary, equipment, alerts, dataset, selectedId, healthMap,
    recommendation, report, conversationId, busy, error, notice,
    live, apiStatus, roles, selectedRole, notifications, notificationsUpdatedAt,
    openaiEnabled, ragProvider, mlModelLabel, initialLoading,
    hydrationProgress, hydrationStatus, selectedHealth, selectedAlert,
    selectedEquipment, selectedEquipmentName,
    setSelectedId, setLive, setSelectedRole, setError, setNotice, setReport,
    loadDashboard, advanceStream, loadNotifications, sendChat, startNewChat,
    generateReport, recordFeedback, lockFeedback, unlockFeedback
  }

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider")
  return ctx
}
