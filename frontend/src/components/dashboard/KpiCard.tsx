import type { ReactNode } from "react"

interface KpiCardProps {
  title: string
  value: string
  suffix?: string
  detail: string
  icon: ReactNode
  tone: "teal" | "red" | "orange" | "amber" | "dark"
}

const toneStyles = {
  teal: { bar: "bg-sg-teal", icon: "border-sg-teal/25 bg-sg-teal/10 text-sg-teal" },
  red: { bar: "bg-sg-red", icon: "border-sg-red/25 bg-sg-red/10 text-sg-red" },
  orange: { bar: "bg-sg-orange", icon: "border-sg-orange/25 bg-sg-orange/10 text-sg-orange" },
  amber: { bar: "bg-sg-amber", icon: "border-sg-amber/25 bg-sg-amber/10 text-sg-amber" },
  dark: { bar: "bg-sg-dark", icon: "border-sg-dark/25 bg-sg-dark/10 text-sg-dark" },
}

export function KpiCard({ title, value, suffix, detail, icon, tone }: KpiCardProps) {
  const s = toneStyles[tone]
  return (
    <section className="panel min-h-[120px] p-4 overflow-hidden">
      <span className={`absolute inset-x-0 top-0 h-[3px] ${s.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-sg-slate">{title}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-sg-dark">
            {value}
            {suffix && <span className="ml-1 text-sm font-semibold text-sg-slate">{suffix}</span>}
          </p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${s.icon}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-sg-slate">{detail}</p>
    </section>
  )
}
