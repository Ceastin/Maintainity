import { cn } from "@/lib/utils"

type ApiStatus = "checking" | "online" | "offline"

interface ConnectionPillProps {
  status: ApiStatus
  compact?: boolean
  className?: string
}

const config: Record<ApiStatus, { label: string; dot: string; bg: string; border: string; text: string }> = {
  online: {
    label: "Online",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-600"
  },
  offline: {
    label: "Offline",
    dot: "bg-red-500",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-600"
  },
  checking: {
    label: "Checking",
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-600"
  }
}

export function ConnectionPill({ status, compact, className }: ConnectionPillProps) {
  const c = config[status]
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wide",
      compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
      c.bg, c.border, c.text,
      className
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", c.dot)} />
      {c.label}
    </span>
  )
}
