import { Loader2 } from "lucide-react"

interface LoadingPanelProps {
  label?: string
  className?: string
}

export function LoadingPanel({ label = "data", className }: LoadingPanelProps) {
  return (
    <section className={`panel flex h-64 items-center justify-center p-4 text-sm font-semibold text-sg-slate ${className ?? ""}`}>
      <span className="inline-flex items-center gap-2">
        <Loader2 size={17} className="animate-spin text-sg-teal" />
        Loading {label}...
      </span>
    </section>
  )
}
