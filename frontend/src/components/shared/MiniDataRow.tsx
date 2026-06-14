interface MiniDataRowProps {
  label: string
  value: string
}

export function MiniDataRow({ label, value }: MiniDataRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 text-sg-slate">
      <span className="truncate text-xs font-semibold">{label}</span>
      <span className="truncate text-right text-xs font-bold text-sg-dark">{value}</span>
    </div>
  )
}
