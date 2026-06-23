import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import Card from '../ui/Card'
import LoadingSpinner from '../ui/LoadingSpinner'
import { usePayerPerformance } from '../../hooks/usePayerPerformance'
import type { PayerPerformance } from '../../types'

type SortKey = keyof PayerPerformance

export default function PayerPerformanceSection() {
  const { data: payers, isLoading } = usePayerPerformance()
  const [sortKey, setSortKey] = useState<SortKey>('totalClaims')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const toggle = (k: SortKey) => {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('desc') }
  }

  const sorted = useMemo(() => {
    if (!payers) return []
    return [...payers].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity
      const bv = b[sortKey] ?? -Infinity
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [payers, sortKey, sortDir])

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col
      ? (sortDir === 'asc' ? <ChevronUp size={12} className="inline" /> : <ChevronDown size={12} className="inline" />)
      : null

  const columns: [SortKey, string][] = [
    ['payer',             'Payer'],
    ['totalClaims',       'Total Claims'],
    ['avgDaysToPay',      'Avg Days to Pay'],
    ['collectionRate',    'Collection Rate'],
    ['pendingCount',      'Pending'],
    ['oldestPendingDays', 'Oldest Pending'],
  ]

  return (
    <div>
      <h2 className="font-heading text-base font-semibold text-ink mb-4">Payer Performance</h2>

      {isLoading && <LoadingSpinner label="Loading…" />}

      {sorted.length > 0 && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead className="bg-surface-sunken border-b border-border">
                <tr>
                  {columns.map(([col, label]) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide cursor-pointer select-none hover:text-ink text-right first:text-left"
                      onClick={() => toggle(col)}
                    >
                      {label} <SortIcon col={col} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map(p => (
                  <tr key={p.payer} className="hover:bg-surface-sunken transition-colors">
                    <td className="px-4 py-3 font-medium text-ink">{p.payer}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{p.totalClaims}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {p.avgDaysToPay != null ? `${p.avgDaysToPay}d` : '—'}
                    </td>
                    <td className={[
                      'px-4 py-3 text-right tabular-nums font-medium',
                      p.collectionRate != null && p.collectionRate < 0.80 ? 'text-amber-600' : 'text-ink',
                    ].join(' ')}>
                      {p.collectionRate != null ? `${Math.round(p.collectionRate * 100)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{p.pendingCount}</td>
                    <td className={[
                      'px-4 py-3 text-right tabular-nums',
                      p.oldestPendingDays != null && p.oldestPendingDays >= 90 ? 'text-error font-medium' : 'text-muted',
                    ].join(' ')}>
                      {p.oldestPendingDays != null ? `${p.oldestPendingDays}d` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
