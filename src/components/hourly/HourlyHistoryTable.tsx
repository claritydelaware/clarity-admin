import { formatCurrency, CLINICIAN_COLORS } from '../../lib/utils'
import ChartCard from '../charts/ChartCard'
import type { HourlyPerformanceHistory, HourlyPeriodHistoryEntry } from '../../types'

interface Row extends HourlyPeriodHistoryEntry {
  clinician: 'Emily' | 'Shana'
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

export default function HourlyHistoryTable({ history }: { history: HourlyPerformanceHistory }) {
  const rows: Row[] = [
    ...history.Emily.map(e => ({ ...e, clinician: 'Emily' as const })),
    ...history.Shana.map(e => ({ ...e, clinician: 'Shana' as const })),
  ].sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime())

  if (rows.length === 0) return null

  const headers = [
    'Period', 'Clinician', 'Sessions', 'Revenue', 'Received', '% by Pay Date',
    'Session Pay', 'Admin Pay', 'Bonus', 'Overhead', 'Total Exp.', 'Profit', 'Margin',
  ]

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-base font-semibold text-ink">Full Pay Period History</h2>
      <ChartCard title="All Closed Periods">
        <div className="overflow-x-auto -mx-5">
          <table className="w-full min-w-240 px-5 text-xs font-body">
            <thead>
              <tr className="border-b border-border">
                {headers.map(h => (
                  <th key={h} className="text-left text-muted uppercase tracking-wide font-medium font-ui pb-2 pr-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.clinician}-${r.periodStart}-${i}`} className="border-t border-gray-50">
                  <td className="py-1.5 pr-3 whitespace-nowrap text-ink">
                    {new Date(r.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap font-medium" style={{ color: CLINICIAN_COLORS[r.clinician] }}>
                    {r.clinician}
                  </td>
                  <td className="py-1.5 pr-3 tabular-nums text-ink">{r.sessions}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-ink">{formatCurrency(r.revenue)}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-success">{formatCurrency(r.paymentsReceived)}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-muted">{pct(r.pctReceivedByPayDate)}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-ink">{formatCurrency(r.sessionPay)}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-ink">{formatCurrency(r.adminPay)}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-ink">{formatCurrency(r.bonusPay)}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-muted">{formatCurrency(r.overheadCosts)}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-muted">{formatCurrency(r.totalExpenses)}</td>
                  <td className={`py-1.5 pr-3 tabular-nums font-medium ${r.profit >= 0 ? 'text-success' : 'text-error'}`}>{formatCurrency(r.profit)}</td>
                  <td className={`py-1.5 pr-3 tabular-nums ${r.profit >= 0 ? 'text-success' : 'text-error'}`}>{pct(r.profitMargin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}
