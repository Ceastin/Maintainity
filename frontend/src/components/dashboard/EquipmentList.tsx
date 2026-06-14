import { Activity, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDashboard } from "@/context/DashboardContext"
import { RiskBadge } from "@/components/shared/RiskBadge"
import type { Equipment } from "@/lib/types"

interface Props {
  equipment: Equipment[]
}

export function EquipmentList({ equipment }: Props) {
  const { selectedId, setSelectedId, healthMap } = useDashboard()

  return (
    <div className="space-y-2">
      {!equipment.length && (
        <div className="rounded-lg border border-sg-stone bg-white p-4 text-sm font-semibold text-sg-slate text-center">
          No matching assets.
        </div>
      )}
      {equipment.map((item) => {
        const health = healthMap[item.id]
        const selected = selectedId === item.id
        return (
          <button
            key={item.id}
            type="button"
            title={`Open ${item.name}`}
            onClick={() => setSelectedId(item.id)}
            className={cn(
              "relative min-h-[100px] w-full overflow-hidden rounded-lg border p-4 text-left transition-all duration-200",
              selected
                ? "border-sg-orange/30 bg-sg-orange/[0.03]"
                : "border-sg-stone bg-white hover:border-sg-orange/25 hover:bg-sg-orange/[0.02]"
            )}
          >
            <span className={cn("absolute inset-y-0 left-0 w-[3px] rounded-r-full transition-all", selected ? "bg-sg-orange" : "bg-transparent")} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-sg-dark">{item.name}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-sg-slate">
                  <MapPin size={13} />
                  {item.area}
                </p>
              </div>
              <RiskBadge risk={health?.risk_level ?? item.status} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-sg-stone bg-sg-marble px-2.5 py-2 text-xs text-sg-slate">
              <span className="flex min-w-0 items-center gap-1">
                <Activity size={13} />
                <span className="truncate">Priority {health?.priority_score ?? Math.round(item.criticality * 100)}</span>
              </span>
              <span className="shrink-0 font-mono">RUL {health?.rul_estimate.hours ?? "-"}h</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
