interface SectionHeadingProps {
  kicker: string
  title: string
  detail?: string
}

export function SectionHeading({ kicker, title, detail }: SectionHeadingProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <p className="kicker">{kicker}</p>
        <h2 className="mt-1 text-base font-bold text-sg-dark">{title}</h2>
      </div>
      {detail && <p className="text-xs font-semibold text-sg-slate">{detail}</p>}
    </div>
  )
}
