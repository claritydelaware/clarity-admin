import Card from '../ui/Card'
import { formatCurrency } from '../../lib/utils'
import type { HourlyPerformanceHistory, HourlyPeriodHistoryEntry } from '../../types'

function avg(entries: HourlyPeriodHistoryEntry[], pick: (e: HourlyPeriodHistoryEntry) => number): number {
  if (entries.length === 0) return 0
  return entries.reduce((s, e) => s + pick(e), 0) / entries.length
}

function pctOfRevenue(part: number, revenue: number): string {
  return revenue > 0 ? `${((part / revenue) * 100).toFixed(1)}%` : '—'
}

const COST_ROWS: Array<{ label: string; pick: (e: HourlyPeriodHistoryEntry) => number }> = [
  { label: 'Session Pay',   pick: e => e.sessionPay },
  { label: 'Admin Pay',     pick: e => e.adminPay },
  { label: 'Bonus Pay',     pick: e => e.bonusPay },
  { label: 'Overhead',      pick: e => e.overheadCosts },
]

export default function HourlyCostBreakdown({ history }: { history: HourlyPerformanceHistory }) {
  const clinicians = [
    { name: 'Emily' as const, entries: history.Emily },
    { name: 'Shana' as const, entries: history.Shana },
  ].filter(c => c.entries.length > 0)

  if (clinicians.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-base font-semibold text-ink">Cost Structure & Collection Health</h2>
      <p className="text-xs text-muted font-body -mt-2">Per-period averages since hire.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {clinicians.map(({ name, entries }) => {
          const avgRevenue = avg(entries, e => e.revenue)
          const avgToDate = avg(entries, e => e.pctReceivedToDate)
          const avgByPayDate = avg(entries, e => e.pctReceivedByPayDate)
          return (
            <Card key={name} padding="none">
              <div className="px-5 py-3 border-b border-border bg-surface-sunken flex items-center justify-between">
                <p className="text-xs font-medium text-muted uppercase tracking-wide">{name}</p>
                <p className="text-xs text-muted font-body">Avg revenue/period: {formatCurrency(avgRevenue)}</p>
              </div>
              <table className="w-full text-sm font-body">
                <tbody className="divide-y divide-gray-50">
                  {COST_ROWS.map(row => {
                    const val = avg(entries, row.pick)
                    return (
                      <tr key={row.label}>
                        <td className="px-4 py-2 text-ink">{row.label}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-ink">{formatCurrency(val)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted w-16">{pctOfRevenue(val, avgRevenue)}</td>
                      </tr>
                    )
                  })}
                  <tr className="bg-surface-sunken">
                    <td className="px-4 py-2 text-ink font-medium">Collected by pay date</td>
                    <td colSpan={2} className="px-4 py-2 text-right tabular-nums text-ink font-medium">
                      {(avgByPayDate * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-muted">Collected to date</td>
                    <td colSpan={2} className="px-4 py-2 text-right tabular-nums text-muted">
                      {(avgToDate * 100).toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
