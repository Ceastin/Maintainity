import { Database, Gauge, Bot, FileText } from "lucide-react"
import { useDashboard } from "@/context/DashboardContext"
import { formatNumber, compactDate } from "@/lib/utils"

export function DecisionFlow() {
  const { dataset, selectedHealth, recommendation, report } = useDashboard()

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <FlowStep
        icon={<Database size={18} />}
        title="Telemetry"
        value={`Step ${dataset?.stream_step ?? 0}`}
        detail={`${formatNumber(dataset?.rows_loaded ?? 0)} rows loaded`}
        state="complete"
      />
      <FlowStep
        icon={<Gauge size={18} />}
        title="Risk scoring"
        value={selectedHealth ? `${selectedHealth.priority_score}/100` : "Waiting"}
        detail={selectedHealth ? `${selectedHealth.metrics.length} metrics scored` : "Select asset"}
        state={selectedHealth ? "complete" : "pending"}
      />
      <FlowStep
        icon={<Bot size={18} />}
        title="AI plan"
        value={recommendation ? `${Math.round(recommendation.confidence * 100)}% confidence` : "Pending"}
        detail={recommendation ? recommendation.urgency.replaceAll("_", " ") : "Recommendation loading"}
        state={recommendation ? "complete" : "pending"}
      />
      <FlowStep
        icon={<FileText size={18} />}
        title="Report"
        value={report ? "Ready" : "Draft"}
        detail={report ? compactDate(report.generated_at) : "Generate from action plan"}
        state={report ? "complete" : "pending"}
      />
    </section>
  )
}

function FlowStep({
  icon,
  title,
  value,
  detail,
  state,
}: {
  icon: React.ReactNode
  title: string
  value: string
  detail: string
  state: "complete" | "pending"
}) {
  return (
    <article className="panel flex min-h-[100px] items-start gap-3 p-4">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
          state === "complete"
            ? "border-sg-orange/25 bg-sg-orange/10 text-sg-orange"
            : "border-sg-stone bg-sg-stone text-sg-slate"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-sg-slate">{title}</p>
        <p className="mt-1 truncate text-sm font-bold text-sg-dark">{value}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-sg-slate">{detail}</p>
      </div>
    </article>
  )
}
