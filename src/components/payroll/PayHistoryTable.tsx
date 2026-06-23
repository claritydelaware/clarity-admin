import { formatCurrency } from '../../lib/utils'
import type { EmilyPaymentAnalysisRow } from '../../types'

export default function PayHistoryTable({ rows }: { rows: EmilyPaymentAnalysisRow[] }) {
  const fmt = formatCurrency
  const pct = (n: number) => `${n.toFixed(1)}%`

  if (rows.length === 0) {
    return <p className="text-sm font-body text-muted italic">No pay history available yet.</p>
  }

  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full min-w-200 px-5 text-xs font-body">
        <thead>
          <tr className="border-b border-border">
            {['Period', 'Revenue', 'Received', '% by Pay Date', 'Session Pay', 'Admin Pay', 'Bonus', 'Overhead', 'Total Exp.', 'Profit', 'Margin'].map(h => (
              <th key={h} className="text-left text-muted uppercase tracking-wide font-medium font-ui pb-2 pr-3 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-gray-50">
              <td className="py-1.5 pr-3 whitespace-nowrap text-ink">{r.periodStart ? new Date(r.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}</td>
              <td className="py-1.5 pr-3 tabular-nums text-ink">{fmt(r.revenue)}</td>
              <td className="py-1.5 pr-3 tabular-nums text-success">{fmt(r.paymentsReceived)}</td>
              <td className="py-1.5 pr-3 tabular-nums text-muted">{pct(r.pctReceivedByPayDate)}</td>
              <td className="py-1.5 pr-3 tabular-nums text-ink">{fmt(r.sessionPay)}</td>
              <td className="py-1.5 pr-3 tabular-nums text-ink">{fmt(r.adminPay)}</td>
              <td className="py-1.5 pr-3 tabular-nums text-ink">{fmt(r.bonusPay)}</td>
              <td className="py-1.5 pr-3 tabular-nums text-muted">{fmt(r.overheadCosts)}</td>
              <td className="py-1.5 pr-3 tabular-nums text-muted">{fmt(r.totalExpenses)}</td>
              <td className={`py-1.5 pr-3 tabular-nums font-medium ${r.profit >= 0 ? 'text-success' : 'text-error'}`}>{fmt(r.profit)}</td>
              <td className={`py-1.5 pr-3 tabular-nums ${r.profit >= 0 ? 'text-success' : 'text-error'}`}>{pct(r.profitMargin)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
