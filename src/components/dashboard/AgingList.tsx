import { formatCurrency } from '../../lib/utils'
import { COLORS } from '../../lib/chartTheme'

interface Row { label: string; count: number; total: number }

// Warms up with age: the older the balance, the closer to red.
const STEP_COLORS = [COLORS.tealMid, COLORS.gold, COLORS.warning, COLORS.error]

export default function AgingList({ rows }: { rows: Row[] }) {
  const max = Math.max(...rows.map(r => r.total), 1)
  return (
    <ul className="divide-y divide-border border-t border-border">
      {rows.map((r, i) => {
        const hot = i === rows.length - 1 && r.total > 0
        return (
          <li key={r.label} className="px-5 py-3">
            <div className="flex items-center justify-between gap-4">
              <p className={`text-sm font-medium font-body ${hot ? 'text-error' : 'text-ink'}`}>{r.label}</p>
              <p className="text-sm font-body tabular-nums">
                <span className="text-muted mr-3">{r.count} claim{r.count !== 1 ? 's' : ''}</span>
                <span className={`font-medium ${hot ? 'text-error' : 'text-ink'}`}>{formatCurrency(r.total)}</span>
              </p>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(r.total / max) * 100}%`, backgroundColor: STEP_COLORS[i] }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
