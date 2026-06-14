import { FileText, Sparkles, Download, X, CheckCircle2 } from "lucide-react"
import { useDashboard } from "@/context/DashboardContext"
import { SectionHeading } from "@/components/shared/SectionHeading"
import { RiskBadge } from "@/components/shared/RiskBadge"

export default function ReportsPage() {
  const { report, recommendation, selectedEquipmentName, generateReport, setReport, busy } = useDashboard()


  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeading kicker="Reports" title="Generated Reports" detail="Maintenance reports and AI recommendations" />

      {/* Generate Report */}
      <section className="panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="kicker">Generate</p>
            <h2 className="mt-1 text-base font-bold text-sg-dark">Create New Report</h2>
            <p className="mt-1 text-xs text-sg-slate">
              Generate a maintenance report for {selectedEquipmentName ?? "the selected asset"} based on the latest AI recommendation.
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-sg-teal/25 bg-sg-teal/10 text-sg-teal shrink-0">
            <FileText size={20} />
          </span>
        </div>
        <button
          onClick={() => void generateReport()}
          disabled={busy}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-sg-teal hover:bg-sg-orange-hover text-white text-xs font-bold rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <Sparkles size={16} />
          {busy ? "Generating..." : "Generate Report"}
        </button>
      </section>

      {/* Active Report */}
      {report && (
        <section className="panel p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="kicker">Report</p>
              <h2 className="mt-1 text-base font-bold text-sg-dark">{report.title}</h2>
              <p className="text-xs text-sg-slate mt-1">
                Generated {new Date(report.generated_at).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sg-stone px-3 text-xs font-semibold text-sg-slate hover:bg-sg-marble transition-colors">
                <Download size={14} /> Export
              </button>
              <button
                onClick={() => setReport(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sg-stone text-sg-slate hover:bg-sg-marble transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="prose prose-sm max-w-none">
            <div className="bg-sg-marble rounded-lg p-4 border border-sg-stone">
              <div dangerouslySetInnerHTML={{ __html: report.markdown.replace(/\n/g, "<br/>") }} />
            </div>
          </div>
        </section>
      )}

      {/* Recommendation Details */}
      {recommendation && (
        <section className="panel p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="kicker">Recommendation</p>
              <h2 className="mt-1 text-base font-bold text-sg-dark">Current AI Recommendation</h2>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-sg-teal/25 bg-sg-teal/10 text-sg-teal shrink-0">
              <Sparkles size={20} />
            </span>
          </div>

          <div className="space-y-4">
            {/* Diagnosis */}
            <div className="card-muted p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-sg-slate mb-1">Diagnosis</p>
              <p className="text-sm text-sg-dark leading-relaxed">{recommendation.diagnosis}</p>
            </div>

            {/* Root Causes */}
            {recommendation.probable_root_causes.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-sg-slate mb-2">Probable Root Causes</p>
                <ul className="space-y-1.5">
                  {recommendation.probable_root_causes.map((cause, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-sg-dark">
                      <CheckCircle2 size={14} className="text-sg-teal mt-0.5 shrink-0" />
                      {cause}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Immediate Actions */}
            {recommendation.immediate_actions.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-sg-slate mb-2">Immediate Actions</p>
                <div className="space-y-2">
                  {recommendation.immediate_actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-sg-dark bg-sg-teal/5 border border-sg-teal/10 rounded-lg p-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sg-teal text-white text-[10px] font-bold">
                        {i + 1}
                      </span>
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-sg-stone">
              <RiskBadge risk={recommendation.risk_level} />
              <span className="text-xs font-mono text-sg-slate px-2 py-0.5 bg-sg-marble rounded">
                Confidence: {Math.round(recommendation.confidence * 100)}%
              </span>
              <span className="text-xs font-mono text-sg-slate px-2 py-0.5 bg-sg-marble rounded">
                Urgency: {recommendation.urgency.replaceAll("_", " ")}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Agent Trace */}
      {recommendation?.node_trace && recommendation.node_trace.length > 0 && (
        <section className="panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-sg-teal" />
            <h2 className="text-base font-bold text-sg-dark">Decision Checkpoints</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {recommendation.node_trace.map((node, index) => {
              const status = String((node as Record<string, unknown>).status ?? "complete")
              const isLlm = String(node.node) === "llm_reasoning"
              const labelColor = isLlm
                ? status === "complete" ? "text-sg-teal" : "text-sg-amber"
                : "text-sg-orange"
              return (
                <article key={`${String(node.node)}-${index}`} className="card-muted p-3">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-bold uppercase tracking-wide ${labelColor}`}>
                      {String(node.node).replaceAll("_", " ")}
                    </p>
                    {isLlm && (
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        status === "complete" ? "bg-emerald-50 text-sg-teal" : "bg-amber-50 text-sg-amber"
                      }`}>
                        {status === "complete" ? "LLM" : "Template"}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-4 text-xs leading-5 text-sg-slate">{String(node.summary)}</p>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
