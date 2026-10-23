import type { Clinician } from '../../types'
import { CLINICIAN_COLORS } from '../../lib/chartTheme'

const SCALE_MAX = 120 // bar spans 0–120% so over-capacity is visible, not clipped

interface Props {
  clinicians: Clinician[]
  values: Record<Clinician, number>
}

function state(pct: number): { text: string; cls: string } | null {
  if (pct >= 100) return { text: 'Over capacity', cls: 'text-error' }
  if (pct >= 95) return { text: 'Near capacity', cls: 'text-warning' }
  return null
}

export default function UtilizationBars({ clinicians, values }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-4">
      {clinicians.map(c => {
        const pct = values[c] ?? 0
        const s = state(pct)
        return (
          <div key={c}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-xs font-ui text-muted">{c}</span>
              <span className="text-sm font-ui font-semibold text-ink tabular-nums">
                {Math.round(pct)}%
                {s && <span className={`ml-1.5 text-[11px] font-medium ${s.cls}`}>{s.text}</span>}
              </span>
            </div>
            <div
              className="relative h-2 rounded-full bg-surface-sunken"
              role="meter"
              aria-label={`${c} utilization`}
              aria-valuemin={0}
              aria-valuemax={SCALE_MAX}
              aria-valuenow={Math.round(pct)}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${(Math.min(pct, SCALE_MAX) / SCALE_MAX) * 100}%`, backgroundColor: CLINICIAN_COLORS[c] }}
              />
              {/* 100% target marker */}
              <div
                className="absolute -top-0.5 -bottom-0.5 w-px bg-ink/40"
                style={{ left: `${(100 / SCALE_MAX) * 100}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
