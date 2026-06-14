import { Bell, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDashboard } from "@/context/DashboardContext"
import { RiskBadge } from "@/components/shared/RiskBadge"
import { SectionHeading } from "@/components/shared/SectionHeading"
import { compactTime } from "@/lib/utils"

export default function AlertsPage() {
  const { alerts, notifications, selectedRole, setSelectedRole, roles, loadNotifications, apiStatus, busy } = useDashboard()

  const fallbackRoles = roles.length
    ? roles
    : [{ id: "maintenance_engineer" as const, label: "Maintenance Engineer" }]

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeading kicker="Alert Center" title="Live incident feed & notifications" detail={`${alerts.length} active alerts`} />

      {/* Role selector */}
      <div className="panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wide text-sg-slate">Notification role:</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as typeof selectedRole)}
            className="field-control text-sm font-semibold"
          >
            {fallbackRoles.map((role) => (
              <option key={role.id} value={role.id}>{role.label}</option>
            ))}
          </select>
          <button
            onClick={() => void loadNotifications(selectedRole)}
            disabled={busy || apiStatus === "offline"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sg-stone text-sg-slate hover:bg-sg-marble transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Active Alerts */}
        <section className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="kicker">Active</p>
              <h2 className="mt-1 text-base font-bold text-sg-dark">Live Alerts</h2>
            </div>
            <span className="rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-bold text-sg-red">
              {alerts.length}
            </span>
          </div>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
            {!alerts.length && (
              <p className="py-6 text-sm text-center text-sg-slate">No active alerts.</p>
            )}
          </div>
        </section>

        {/* Role Notifications */}
        <section className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="kicker">Routed</p>
              <h2 className="mt-1 text-base font-bold text-sg-dark">Role Notifications</h2>
            </div>
            <span className="rounded-full bg-sg-orange/10 border border-sg-orange/20 px-2.5 py-1 text-xs font-bold text-sg-orange">
              {notifications.length}
            </span>
          </div>
          <div className="space-y-3">
            {notifications.slice(0, 8).map((item) => (
              <div key={item.id} className="grid grid-cols-[auto_1fr] gap-3 rounded-lg border border-sg-stone bg-sg-marble px-3 py-3">
                <span className={cn(
                  "mt-0.5 flex h-8 w-8 items-center justify-center rounded-md shrink-0",
                  item.severity === "critical" ? "bg-red-50 text-sg-red" :
                  item.severity === "high" ? "bg-orange-50 text-sg-orange" :
                  "bg-amber-50 text-sg-amber"
                )}>
                  <Bell size={16} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 flex-1 text-sm font-bold leading-5 text-sg-dark">{item.title}</span>
                    <span className="shrink-0 text-[11px] font-bold text-sg-slate">{compactTime(item.timestamp)}</span>
                  </div>
                  <RiskBadge risk={item.severity} className="mt-1" />
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-sg-slate">{item.message}</p>
                  <p className="mt-1.5 text-xs font-semibold text-sg-orange">{item.action}</p>
                </div>
              </div>
            ))}
            {!notifications.length && (
              <p className="py-6 text-sm text-center text-sg-slate">No routed notifications for this role.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function AlertCard({ alert }: { alert: { id: string; message: string; severity: string; signal: string; value: number; timestamp: string } }) {
  const { setSelectedId } = useDashboard()
  return (
    <button
      onClick={() => setSelectedId(alert.id)}
      className="w-full grid grid-cols-[auto_1fr] gap-3 rounded-lg border border-sg-stone bg-white px-3 py-3 text-left transition-all hover:border-sg-orange/25 hover:shadow-sm"
    >
      <span className={cn(
        "mt-0.5 flex h-8 w-8 items-center justify-center rounded-md shrink-0",
        alert.severity === "critical" ? "bg-red-50 text-sg-red" :
        alert.severity === "high" ? "bg-orange-50 text-sg-orange" :
        "bg-amber-50 text-sg-amber"
      )}>
        <Bell size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-sg-dark">{alert.message}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-sg-slate">
          <span>{compactTime(alert.timestamp)}</span>
          <span>{alert.signal} = {alert.value}</span>
          <RiskBadge risk={alert.severity} />
        </div>
      </div>
    </button>
  )
}
