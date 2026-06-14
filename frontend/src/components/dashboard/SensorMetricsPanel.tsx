import { Activity } from "lucide-react"
import type { HealthMetric } from "@/lib/types"
import { riskTextColor } from "@/lib/utils"

export function SensorMetricsPanel({ metrics }: { metrics: HealthMetric[] }) {
  return (
    <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <div
          key={metric.name}
          className="rounded-lg border border-sg-stone bg-white p-4 transition-all duration-200 hover:border-sg-orange/25 hover:shadow-card"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-sg-slate mb-2">
            <Activity size={13} />
            {metric.name}
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-lg font-bold text-sg-dark font-mono">
                {typeof metric.value === "number" ? metric.value.toFixed(1) : metric.value}
                <span className="ml-1 text-xs text-sg-slate font-sans">{metric.unit}</span>
              </p>
              <p className="text-[10px] text-sg-slate mt-0.5">{metric.threshold}</p>
            </div>
            <span className={`text-[11px] font-bold uppercase ${riskTextColor(metric.status)}`}>
              {metric.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
