import { useMemo } from "react"
import { Activity, Calendar, Wrench, Clock } from "lucide-react"
import { useDashboard } from "@/context/DashboardContext"
import { SectionHeading } from "@/components/shared/SectionHeading"
import { RiskBadge } from "@/components/shared/RiskBadge"
import { riskBarColor } from "@/lib/utils"


export default function MaintenancePage() {
  const { equipment, healthMap, setSelectedId } = useDashboard()

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
        recommendation: health ? `${health.urgency.replaceAll("_", " ")} maintenance required` : "No data",
      }
    })
  }, [equipment, healthMap])

  const sortedByRisk = useMemo(() => [...equipmentWithHealth].sort((a, b) => b.priority - a.priority), [equipmentWithHealth])

  // Simulate maintenance timeline events
  const timelineEvents = [
    { date: "Today", events: [{ type: "alert", title: "High vibration detected on Rolling Mill #3", asset: "Rolling Mill #3", severity: "high" as const }] },
    { date: "Yesterday", events: [{ type: "maintenance", title: "Scheduled bearing inspection completed", asset: "Conveyor Belt A", severity: "low" as const }, { type: "alert", title: "Temperature spike on Blast Furnace Pump", asset: "Blast Furnace Pump", severity: "medium" as const }] },
    { date: "3 days ago", events: [{ type: "maintenance", title: "Coupling alignment corrected", asset: "Gearbox #2", severity: "low" as const }] },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeading kicker="Maintenance" title="Maintenance Timeline & Forecast" detail={`${equipment.length} assets tracked`} />

      {/* Failure Forecast */}
      <section className="panel p-5">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <p className="kicker">Forecast</p>
            <h2 className="mt-1 text-base font-bold text-sg-dark">Next 7 Days Failure Risk</h2>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-sg-teal/25 bg-sg-teal/10 text-sg-teal">
            <Activity size={18} />
          </span>
        </div>
        <div className="space-y-4">
          {sortedByRisk.slice(0, 6).map((item) => {
            const probability = item.mlProbability > 0
              ? Math.min(99, Math.max(1, Math.round(item.mlProbability * 100)))
              : Math.min(95, Math.max(8, item.priority))
            return (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <p className="truncate font-bold text-sg-dark">{item.name}</p>
                  <span className="text-xs font-bold text-sg-slate">{probability}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-sg-stone">
                    <span className={`block h-full rounded-full ${riskBarColor(item.risk)} transition-all duration-500`} style={{ width: `${probability}%` }} />
                  </span>
                  <span className="w-12 text-right text-xs font-semibold text-sg-slate font-mono">{Math.max(1, Math.ceil(item.rul / 24))}d</span>
                </div>
              </div>
            )
          })}
          {!sortedByRisk.length && <p className="py-6 text-sm text-sg-slate text-center">Failure model loading.</p>}
        </div>
      </section>

      {/* Maintenance Timeline */}
      <section className="panel p-5">
        <div className="flex items-center gap-2 mb-5">
          <Clock size={18} className="text-sg-teal" />
          <h2 className="text-base font-bold text-sg-dark">Recent Activity</h2>
        </div>
        <div className="space-y-6">
          {timelineEvents.map((day) => (
            <div key={day.date}>
              <h3 className="text-xs font-bold uppercase tracking-wide text-sg-slate mb-3 flex items-center gap-2">
                <Calendar size={12} />
                {day.date}
              </h3>
              <div className="space-y-2 ml-4 border-l-2 border-sg-stone pl-4">
                {day.events.map((event, i) => (
                  <div key={i} className="relative pb-3">
                    <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white ${
                      event.severity === "high" ? "bg-sg-red" : event.severity === "medium" ? "bg-sg-amber" : "bg-sg-teal"
                    }`} />
                    <p className="text-sm font-semibold text-sg-dark">{event.title}</p>
                    <p className="text-xs text-sg-slate">{event.asset}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Maintenance Schedule */}
      <section className="panel p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="kicker">Schedule</p>
            <h2 className="mt-1 text-base font-bold text-sg-dark">Recommended Actions</h2>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-sg-teal/25 bg-sg-teal/10 text-sg-teal">
            <Wrench size={18} />
          </span>
        </div>
        <div className="space-y-3">
          {sortedByRisk.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-sg-stone bg-sg-marble px-4 py-3 cursor-pointer hover:border-sg-teal/25 transition-colors"
              onClick={() => setSelectedId(item.id)}
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-sg-dark">{item.name}</p>
                <p className="text-xs text-sg-slate mt-0.5">{item.recommendation}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-mono text-sg-slate">RUL {item.rul}h</span>
                <RiskBadge risk={item.risk} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
