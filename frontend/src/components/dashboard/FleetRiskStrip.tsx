export function FleetRiskStrip({
  overview,
}: {
  overview: { healthy: number; warning: number; critical: number; unknown: number; total: number }
}) {
  const total = Math.max(overview.total, 1)
  const segments = [
    { label: "Healthy", value: overview.healthy, color: "bg-sg-teal" },
    { label: "Warning", value: overview.warning, color: "bg-sg-amber" },
    { label: "Critical", value: overview.critical, color: "bg-sg-red" },
    { label: "Unknown", value: overview.unknown, color: "bg-sg-stone" },
  ]

  return (
    <div className="mt-5">
      <div className="flex h-2 overflow-hidden rounded-full bg-sg-stone">
        {segments.map((seg) => (
          <span
            key={seg.label}
            className={`${seg.color} transition-all duration-500`}
            style={{ width: `${Math.max(seg.value ? 8 : 0, (seg.value / total) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-sg-slate">
        {segments.map((seg) => (
          <span key={seg.label}>
            {seg.label}: <span className="text-sg-dark">{seg.value}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
