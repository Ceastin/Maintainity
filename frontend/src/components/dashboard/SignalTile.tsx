import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SignalTileProps {
  icon: ReactNode
  label: string
  value: string
  tone: string
}

export function SignalTile({ icon, label, value, tone }: SignalTileProps) {
  return (
    <div className="rounded-lg border border-sg-stone bg-sg-marble p-3 transition-all duration-200 hover:border-sg-orange/25">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-sg-slate">
        <span className="text-sg-slate">{icon}</span>
        {label}
      </div>
      <p className={cn("mt-2 truncate text-xl font-bold tracking-tight", tone)}>{value}</p>
    </div>
  )
}
