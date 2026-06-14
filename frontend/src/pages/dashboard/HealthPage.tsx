import { useDashboard } from "@/context/DashboardContext"
import { HealthChart } from "@/components/dashboard/HealthChart"
import { MlPredictionCard } from "@/components/dashboard/MlPredictionCard"
import { SensorMetricsPanel } from "@/components/dashboard/SensorMetricsPanel"
import { LoadingPanel } from "@/components/shared/LoadingPanel"
import { RiskBadge } from "@/components/shared/RiskBadge"
import { SectionHeading } from "@/components/shared/SectionHeading"
import { HealthCommandCenter } from "@/components/dashboard/HealthCommandCenter"
export default function HealthPage() {
  const { healthMap, selectedHealth } = useDashboard()

  // Show all equipment with health data
  const equipmentWithHealth = Object.values(healthMap)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="kicker">Predictive Analytics</p>
        <h1 className="text-2xl font-bold text-sg-dark mt-1">Health Monitoring</h1>
        <p className="text-sm text-sg-slate mt-1">Real-time anomaly detection and ML-based failure prediction</p>
      </div>

      {selectedHealth ? (
        <div className="space-y-6">
          {/* Selected Asset Health */}
          <section className="panel p-5">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-sg-dark">{selectedHealth.equipment.name}</h2>
              <RiskBadge risk={selectedHealth.risk_level} />
              <span className="text-xs font-mono text-sg-slate">
                Priority: {selectedHealth.priority_score}/100
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <HealthMetric label="Anomaly Score" value={`${Math.round(selectedHealth.anomaly_score * 100)}%`} />
              <HealthMetric label="RUL Estimate" value={`${selectedHealth.rul_estimate.hours}h`} />
              <HealthMetric label="Priority" value={`${selectedHealth.priority_score}/100`} />
              <HealthMetric label="Confidence" value={`${Math.round(selectedHealth.rul_estimate.confidence * 100)}%`} />
            </div>
          </section>
          <HealthCommandCenter health={selectedHealth} />
          <HealthChart health={selectedHealth} />
          <MlPredictionCard prediction={selectedHealth.ml_prediction} />

          <section>
            <SectionHeading kicker="Sensor metrics" title="Current readings" detail={`${selectedHealth.metrics.length} signals`} />
            <div className="mt-3">
              <SensorMetricsPanel metrics={selectedHealth.metrics} />
            </div>
          </section>

          {/* Process Defects */}
          {selectedHealth.process_defects.length > 0 && (
            <section className="panel p-5">
              <SectionHeading kicker="Process defects" title="Steel rule layer" detail={`${selectedHealth.process_defects.length} detected`} />
              <div className="mt-4 space-y-3">
                {selectedHealth.process_defects.slice(0, 5).map((defect: { id: string; defect_type: string; severity: string; explanation: string; confidence: number }) => (
                  <article key={defect.id} className="card-muted p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold capitalize text-sg-dark">
                        {defect.defect_type.replaceAll("_", " ")}
                      </p>
                      <RiskBadge risk={defect.severity} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-sg-slate">{defect.explanation}</p>
                    <p className="mt-2 text-xs font-bold text-sg-orange">{Math.round(defect.confidence * 100)}% confidence</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <LoadingPanel label="health data" />
      )}

      {/* All Equipment Health Summary */}
      <section className="panel p-5">
        <SectionHeading kicker="Fleet overview" title="All equipment health" detail={`${equipmentWithHealth.length} assets monitored`} />
        <div className="mt-4 space-y-2">
          {equipmentWithHealth.slice(0, 10).map((health) => (
            <div
              key={health.equipment.id}
              className="flex items-center justify-between py-2 border-b border-sg-stone last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  health.risk_level === "critical" ? "bg-sg-red" :
                  health.risk_level === "high" ? "bg-sg-orange" :
                  health.risk_level === "medium" ? "bg-sg-amber" : "bg-sg-teal"
                }`} />
                <span className="text-sm font-medium text-sg-dark">{health.equipment.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-sg-slate">RUL {health.rul_estimate.hours}h</span>
                <RiskBadge risk={health.risk_level} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function HealthMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-muted p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-sg-slate">{label}</p>
      <p className="mt-1 text-lg font-bold text-sg-dark font-mono">{value}</p>
    </div>
  )
}
