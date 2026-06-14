import { useMemo } from "react"
import {
  Activity,
  Boxes,
  CalendarDays,
  Database,
  Gauge,
  ShieldCheck,
  TrendingUp,
} from "lucide-react"
import { useDashboard } from "@/context/DashboardContext"
import { KpiCard } from "@/components/dashboard/KpiCard"
import { DecisionFlow } from "@/components/dashboard/DecisionFlow"
import { SignalTile } from "@/components/dashboard/SignalTile"
import { FleetRiskStrip } from "@/components/dashboard/FleetRiskStrip"
import { HealthChart } from "@/components/dashboard/HealthChart"
import { MlPredictionCard } from "@/components/dashboard/MlPredictionCard"
import { SensorMetricsPanel } from "@/components/dashboard/SensorMetricsPanel"
import { EquipmentList } from "@/components/dashboard/EquipmentList"
import { ActiveAlertsCard } from "@/components/dashboard/ActiveAlertsCard"
import { RiskBadge } from "@/components/shared/RiskBadge"
import { SectionHeading } from "@/components/shared/SectionHeading"
import { formatNumber, compactTime, riskTextColor } from "@/lib/utils"
import { HealthCommandCenter } from "@/components/dashboard/HealthCommandCenter"
export default function OverviewPage() {
  const { summary, equipment, alerts, healthMap, selectedId, selectedHealth, dataset } = useDashboard()

  const selectedEquipment = selectedHealth?.equipment ?? equipment.find((item) => item.id === selectedId) ?? null
  const selectedAnomaly = selectedHealth ? Math.round(selectedHealth.anomaly_score * 100) : 0
  const selectedMlProbability = selectedHealth?.ml_prediction
    ? Math.round(selectedHealth.ml_prediction.failure_probability * 100)
    : 0
  const currentStep = dataset?.stream_step ?? summary.stream_step

  const equipmentWithHealth = useMemo(() => {
    return equipment.map((item) => {
      const health = healthMap[item.id]
      return {
        ...item,
        risk: health?.risk_level ?? item.status,
        priority: health?.priority_score ?? Math.round(item.criticality * 100),
        rul: health?.rul_estimate.hours ?? Math.max(1, Math.round((1 - item.criticality) * 72)),
        anomaly: health?.anomaly_score ?? 0,
        mlProbability: health?.ml_prediction?.failure_probability ?? 0,
      }
    })
  }, [equipment, healthMap])

  const riskRankedEquipment = useMemo(
    () => [...equipmentWithHealth].sort((a, b) => b.priority - a.priority),
    [equipmentWithHealth]
  )

  const topCriticalEquipment = useMemo(
    () => riskRankedEquipment.slice(0, 5),
    [riskRankedEquipment]
  )

  const healthOverview = useMemo(() => {
    const counts = equipmentWithHealth.reduce(
      (items, item) => {
        if (item.risk === "low") items.healthy += 1
        if (item.risk === "medium" || item.risk === "high") items.warning += 1
        if (item.risk === "critical") items.critical += 1
        return items
      },
      { healthy: 0, warning: 0, critical: 0 }
    )
    const total = equipment.length || summary.equipment_count || 0
    return { ...counts, unknown: Math.max(0, total - counts.healthy - counts.warning - counts.critical), total }
  }, [equipment.length, equipmentWithHealth, summary.equipment_count])

  const healthScore = useMemo(() => {
    const entries = Object.values(healthMap)
    if (!entries.length) return 0
    const averageAnomaly = entries.reduce((total, item) => total + item.anomaly_score, 0) / entries.length
    return Math.max(1, Math.min(100, Math.round(100 - averageAnomaly * 100)))
  }, [healthMap])

  const selectedPriority = selectedHealth?.priority_score ?? topCriticalEquipment[0]?.priority ?? 0
  const selectedRisk = selectedHealth?.risk_level ?? topCriticalEquipment[0]?.risk ?? "medium"
  const selectedRul = selectedHealth?.rul_estimate.hours ?? summary.average_rul_hours

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero - Selected Asset */}
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="kicker">Selected asset</span>
          <RiskBadge risk={selectedRisk} />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-sg-dark mb-2">
          {selectedEquipment?.name ?? "Select equipment"}
        </h2>
        <p className="text-sm text-sg-slate max-w-3xl leading-relaxed mb-5">
          {selectedEquipment?.description ?? "Backend data will appear here once an equipment asset is selected."}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <SignalTile icon={<Gauge size={16} />} label="Priority" value={`${selectedPriority}/100`} tone={riskTextColor(selectedRisk)} />
          <SignalTile icon={<Activity size={16} />} label="RUL" value={`${selectedRul || 0}h`} tone="text-sg-teal" />
          <SignalTile icon={<TrendingUp size={16} />} label="Anomaly" value={`${selectedAnomaly}%`} tone={selectedAnomaly > 50 ? "text-sg-red" : "text-sg-dark"} />
          <SignalTile icon={<BrainIcon size={16} />} label="ML Failure" value={`${selectedMlProbability}%`} tone={selectedMlProbability > 50 ? "text-sg-red" : "text-sg-teal"} />
          <SignalTile icon={<CalendarDays size={16} />} label="Latest sample" value={compactTime(selectedHealth?.latest_reading.timestamp)} tone="text-sg-dark" />
        </div>
        <FleetRiskStrip overview={healthOverview} />
      </section>
      {selectedHealth ? (
          <HealthCommandCenter health={selectedHealth} />
        ) : (
          <div className="panel p-6 text-center text-sm text-sg-slate">
            Select an asset to view the command center
          </div>
        )}
      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <KpiCard
          title="Assets Online"
          value={String(summary.equipment_count || equipment.length)}
          detail={`${healthOverview.healthy} healthy, ${healthOverview.warning} watchlisted`}
          icon={<Boxes size={20} />}
          tone="teal"
        />
        <KpiCard
          title="Critical Alerts"
          value={String(summary.critical_alert_count)}
          detail={`${summary.open_alert_count || alerts.length} total open alerts`}
          icon={<Activity size={20} />}
          tone="red"
        />
        <KpiCard
          title="Fleet Health"
          value={healthScore ? String(healthScore) : "Loading"}
          suffix={healthScore ? "/100" : undefined}
          detail={healthScore ? `${selectedAnomaly}% anomaly on selected asset` : "Waiting for health scores"}
          icon={<ShieldCheck size={20} />}
          tone="orange"
        />
        <KpiCard
          title="Highest Priority"
          value={String(summary.highest_priority || selectedPriority || 0)}
          suffix="/100"
          detail={`${topCriticalEquipment[0]?.name ?? "No asset"} leads the queue`}
          icon={<Gauge size={20} />}
          tone="amber"
        />
        <KpiCard
          title="Dataset Rows"
          value={formatNumber(dataset?.rows_loaded ?? summary.dataset_rows_loaded)}
          detail={`Stream step ${currentStep}`}
          icon={<Database size={20} />}
          tone="dark"
        />
      </section>

      {/* Decision Flow */}
      <DecisionFlow />

      {/* Main Workspace */}
      <div className="grid gap-6 2xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Health Chart */}
          {selectedHealth ? (
            <HealthChart health={selectedHealth} />
          ) : (
            <div className="panel flex h-80 items-center justify-center text-sm font-semibold text-sg-slate">
              Select an asset to view telemetry trends
            </div>
          )}

          <MlPredictionCard prediction={selectedHealth?.ml_prediction} />

          {/* Sensor Metrics */}
          <section>
            <SectionHeading
              kicker="Sensor metrics"
              title="Current readings"
              detail={selectedHealth ? `${selectedHealth.metrics.length} backend-scored signals` : "Waiting for metrics"}
            />
            <div className="mt-3">
              {selectedHealth ? (
                <SensorMetricsPanel metrics={selectedHealth.metrics} />
              ) : (
                <div className="panel p-6 text-center text-sm text-sg-slate">
                  Sensor data will appear once an asset is selected.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <section>
            <SectionHeading
              kicker="Equipment queue"
              title="Risk-ranked assets"
              detail={`${equipment.length || 0} mapped assets`}
            />
            <div className="mt-3 max-h-[560px] overflow-y-auto pr-1">
              <EquipmentList equipment={riskRankedEquipment} />
            </div>
          </section>

          <ActiveAlertsCard alerts={alerts} />
        </div>
      </div>
    </div>
  )
}

function BrainIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  )
}
