import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDashboard } from "@/context/DashboardContext"
import { RiskBadge } from "@/components/shared/RiskBadge"
import { compactTime } from "@/lib/utils"
import type { Alert } from "@/lib/types"

export function ActiveAlertsCard({ alerts }: { alerts: Alert[] }) {
  const { selectedId, setSelectedId } = useDashboard()

  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="kicker">Alerts</p>
          <h2 className="mt-1 text-base font-bold text-sg-dark">Live incident feed</h2>
        </div>
        <span className="rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-bold text-sg-red">
          {alerts.length}
        </span>
      </div>
      <div className="divide-y divide-sg-stone">
        {alerts.slice(0, 5).map((alert) => (
          <button
            key={alert.id}
            type="button"
            onClick={() => setSelectedId(alert.equipment_id)}
            className={cn(
              "grid w-full grid-cols-[auto_1fr] gap-3 rounded-lg border px-3 py-3 text-left transition-all duration-200",
              selectedId === alert.equipment_id
                ? "border-sg-orange/30 bg-sg-orange/[0.03]"
                : "border-transparent hover:border-sg-orange/20 hover:bg-sg-orange/[0.02]"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-8 w-8 items-center justify-center rounded-md",
                alert.severity === "critical"
                  ? "bg-red-50 text-sg-red"
                  : alert.severity === "high"
                  ? "bg-orange-50 text-sg-orange"
                  : "bg-amber-50 text-sg-amber"
              )}
            >
              <AlertTriangle size={16} />
            </span>
            <span className="min-w-0">
              <span className="line-clamp-2 text-sm font-bold leading-5 text-sg-dark">{alert.message}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-sg-slate">
                <span>{compactTime(alert.timestamp)}</span>
                <span>{alert.signal}</span>
                <RiskBadge risk={alert.severity} />
              </span>
            </span>
          </button>
        ))}
        {!alerts.length && (
          <div className="flex items-center gap-2 py-7 text-sm font-semibold text-sg-teal">
            <CheckCircle2 size={17} />
            No active alerts.
          </div>
        )}
      </div>
    </section>
  )
}
