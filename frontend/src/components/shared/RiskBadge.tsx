import { cn } from "@/lib/utils"
import type { RiskLevel } from "@/lib/types"

interface RiskBadgeProps {
  risk: RiskLevel | string
  className?: string
}

const styles: Record<string, string> = {
  critical: "bg-red-50 text-red-600 border-red-200",
  high: "bg-orange-50 text-orange-600 border-orange-200",
  medium: "bg-amber-50 text-amber-600 border-amber-200",
  low: "bg-emerald-50 text-emerald-600 border-emerald-200",
}

export function RiskBadge({ risk, className }: RiskBadgeProps) {
  const level = String(risk).toLowerCase()
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        styles[level] ?? styles.low,
        className
      )}
    >
      {level}
    </span>
  )
}
