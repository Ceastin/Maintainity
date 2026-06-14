import { useMemo } from "react"
import { MapPin } from "lucide-react"
import { useDashboard } from "@/context/DashboardContext"
import { RiskBadge } from "@/components/shared/RiskBadge"
import { SectionHeading } from "@/components/shared/SectionHeading"
import { cn } from "@/lib/utils"

export default function AssetsPage() {
  const { equipment, healthMap, selectedId, setSelectedId } = useDashboard()

  const equipmentWithHealth = useMemo(() => {
    return equipment.map((item) => {
      const health = healthMap[item.id]
      return {
        ...item,
        risk: health?.risk_level ?? item.status,
        priority: health?.priority_score ?? Math.round(item.criticality * 100),
        rul: health?.rul_estimate.hours ?? Math.max(1, Math.round((1 - item.criticality) * 72)),
        anomaly: health?.anomaly_score ?? 0,
      }
    })
  }, [equipment, healthMap])

  const sorted = useMemo(() => [...equipmentWithHealth].sort((a, b) => b.priority - a.priority), [equipmentWithHealth])

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeading kicker="Asset Management" title="Risk-ranked equipment" detail={`${equipment.length} mapped assets`} />

      {/* Asset table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sg-stone bg-sg-marble">
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-sg-slate">Asset</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-sg-slate">Area</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-sg-slate">Type</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-sg-slate">Risk</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-sg-slate">Priority</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-sg-slate">RUL</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-sg-slate">Anomaly</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sg-stone">
              {sorted.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedId === item.id ? "bg-sg-orange/[0.03]" : "hover:bg-sg-marble"
                  )}
                  onClick={() => setSelectedId(item.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "h-2 w-2 rounded-full",
                        item.risk === "critical" ? "bg-sg-red" :
                        item.risk === "high" ? "bg-sg-orange" :
                        item.risk === "medium" ? "bg-sg-amber" : "bg-sg-teal"
                      )} />
                      <span className="font-semibold text-sg-dark">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sg-slate">
                    <span className="flex items-center gap-1"><MapPin size={12} />{item.area}</span>
                  </td>
                  <td className="px-4 py-3 text-sg-slate">{item.asset_type}</td>
                  <td className="px-4 py-3"><RiskBadge risk={item.risk} /></td>
                  <td className="px-4 py-3 font-mono text-sg-dark">{item.priority}/100</td>
                  <td className="px-4 py-3 font-mono text-sg-dark">{item.rul}h</td>
                  <td className="px-4 py-3 font-mono">{Math.round(item.anomaly * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!sorted.length && (
          <div className="p-8 text-center text-sm text-sg-slate">No equipment data available.</div>
        )}
      </div>
    </div>
  )
}
