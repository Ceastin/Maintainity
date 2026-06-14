import { Brain, Loader2 } from "lucide-react"
import type { MlPrediction } from "@/lib/types"

export function MlPredictionCard({ prediction }: { prediction?: MlPrediction | null }) {
  if (!prediction) {
    return (
      <section className="panel p-5">
        <div className="flex items-center gap-3 text-sm font-semibold text-sg-slate">
          <Loader2 size={17} className="animate-spin text-sg-orange" />
          Training or loading ML classifier
        </div>
      </section>
    )
  }

  const probability = Math.round(prediction.failure_probability * 100)
  const mode = prediction.predicted_failure_mode.replaceAll("_", " ")
  const likelyTone = prediction.failure_likely ? "text-sg-red" : "text-sg-teal"
  const barColor = prediction.failure_likely ? "bg-sg-red" : "bg-sg-teal"

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kicker">ML prediction</p>
          <h2 className="mt-1 flex items-center gap-2 text-base font-bold text-sg-dark">
            <Brain size={18} className="text-sg-orange" />
            Failure classifier
          </h2>
          <p className="mt-1 text-xs font-semibold text-sg-slate">
            {prediction.model_name} - threshold {Math.round(prediction.threshold * 100)}%
          </p>
        </div>
        <div className="rounded-lg border border-sg-stone bg-sg-marble px-3 py-2 text-right">
          <p className={`text-2xl font-bold tabular-nums ${likelyTone}`}>{probability}%</p>
          <p className="text-xs font-bold uppercase tracking-wide text-sg-slate">failure probability</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-sg-stone">
        <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${Math.max(6, probability)}%` }} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MlFact label="Predicted mode" value={mode} strong />
        <MlFact label="Mode confidence" value={`${Math.round(prediction.failure_mode_confidence * 100)}%`} />
        <MlFact label="Validation F1" value={`${Math.round(prediction.validation_f1 * 100)}%`} />
        <MlFact label="Validation recall" value={`${Math.round(prediction.validation_recall * 100)}%`} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {prediction.top_signals.map((signal) => (
          <span key={signal} className="rounded-md border border-sg-orange/25 bg-sg-orange/10 px-2.5 py-1 text-xs font-bold capitalize text-sg-orange">
            {signal.replaceAll("_", " ")}
          </span>
        ))}
      </div>
    </section>
  )
}

function MlFact({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="card-muted px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-sg-slate">{label}</p>
      <p className={`mt-1 truncate text-sm font-bold capitalize ${strong ? "text-sg-dark" : "text-sg-slate"}`}>{value}</p>
    </div>
  )
}
