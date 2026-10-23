export interface StackedSegment {
  label: string
  value: number
  color: string
  display?: string
}

interface StackedBarProps {
  segments: StackedSegment[]
  className?: string
}

/** Part-to-whole bar with a dot legend — replaces "A: 1 · B: 2 · C: 3" text strings. */
export default function StackedBar({ segments, className = '' }: StackedBarProps) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0)
  return (
    <div className={className}>
      <div className="flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-surface-sunken" role="img"
        aria-label={segments.map(s => `${s.label} ${s.display ?? s.value}`).join(', ')}>
        {total > 0 && segments.filter(s => s.value > 0).map(s => (
          <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
        {segments.map(s => (
          <li key={s.label} className="flex items-center gap-1 text-[11px] font-ui text-muted tabular-nums">
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            {s.label} <span className="text-ink font-medium">{s.display ?? s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
