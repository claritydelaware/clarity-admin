import { formatCurrency, getPayerStyle } from '../../lib/utils'
import { COLORS } from '../../lib/chartTheme'

interface Props { rows: { payer: string; amount: number }[] }

/** Sorted horizontal bars with share-of-total — easier to read than rotated-label columns. */
export default function PayerMixList({ rows }: Props) {
  const sorted = [...rows].sort((a, b) => b.amount - a.amount)
  const total = sorted.reduce((s, r) => s + r.amount, 0)
  const max = sorted[0]?.amount || 1
  return (
    <ul className="space-y-2.5">
      {sorted.map(r => (
        <li key={r.payer} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3">
          <span className="flex items-center gap-2 min-w-0">
            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: getPayerStyle(r.payer).backgroundColor }} aria-hidden="true" />
            <span className="truncate text-sm font-body text-ink">{r.payer}</span>
          </span>
          <div className="h-2 rounded-full bg-surface-sunken overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(r.amount / max) * 100}%`, backgroundColor: COLORS.teal }} />
          </div>
          <span className="text-sm font-body tabular-nums text-ink text-right whitespace-nowrap">
            {formatCurrency(r.amount)}
            <span className="ml-2 inline-block w-10 text-xs text-muted">{total > 0 ? `${((r.amount / total) * 100).toFixed(0)}%` : ''}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
