import { formatCurrency } from '../../lib/utils'
import Card from '../ui/Card'
import Avatar from '../ui/Avatar'
import type { PartnerPeriodSummary } from '../../types'

export default function PartnerCard({ summary }: { summary: PartnerPeriodSummary }) {
  const fmt = (n: number) => formatCurrency(n)
  const pct = (n: number) => `${Math.round(n)}%`
  const received = summary.receivedRevenue
  const pending  = summary.pendingRevenue
  const total    = summary.revenue
  const pctRecv  = total > 0 ? (received / total) * 100 : 0
  const hasGustoActuals = summary.overheadSource === 'gusto'

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <Avatar name={summary.clinician} size="md" />
        <h3 className="font-heading text-base font-semibold text-ink">{summary.clinician}</h3>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <dt className="text-xs font-ui text-muted uppercase tracking-wide">Sessions</dt>
          <dd className="font-heading text-xl font-semibold text-ink">{summary.sessions}</dd>
        </div>
        <div>
          <dt className="text-xs font-ui text-muted uppercase tracking-wide">Period Salary</dt>
          <dd className="font-heading text-xl font-semibold text-ink tabular-nums">{fmt(summary.periodSalary)}</dd>
        </div>
        <div>
          <dt className="text-xs font-ui text-muted uppercase tracking-wide">Revenue Generated</dt>
          <dd className="font-heading text-base font-semibold text-ink tabular-nums">{fmt(total)}</dd>
        </div>
        <div>
          <dt className="text-xs font-ui text-muted uppercase tracking-wide">Received</dt>
          <dd className="font-heading text-base font-semibold text-success tabular-nums">{fmt(received)}</dd>
        </div>
        <div>
          <dt className="text-xs font-ui text-muted uppercase tracking-wide">Pending</dt>
          <dd className="font-heading text-base font-semibold text-muted tabular-nums">{fmt(pending)}</dd>
        </div>
        <div>
          <dt className="text-xs font-ui text-muted uppercase tracking-wide">Pct Received</dt>
          <dd className={`font-heading text-base font-semibold tabular-nums ${pctRecv >= 80 ? 'text-success' : 'text-amber-600'}`}>{pct(pctRecv)}</dd>
        </div>
      </dl>

      <div className="border-t border-border pt-3 mt-4 space-y-1.5 text-xs font-body">
        <div className="flex justify-between text-muted">
          <span>
            {hasGustoActuals
              ? <>Overhead <span className="text-teal font-medium">(from Gusto)</span></>
              : 'Overhead'
            }
          </span>
          <span className="tabular-nums">{fmt(summary.overheadCosts)}</span>
        </div>
        {summary.stripeFeesCost > 0 && (
          <div className="flex justify-between text-muted">
            <span>Stripe Fees (on client-collected payments)</span>
            <span className="tabular-nums">{fmt(summary.stripeFeesCost)}</span>
          </div>
        )}
        <div className="flex justify-between font-medium">
          <span>Total Expenses</span>
          <span className="tabular-nums">{fmt(summary.totalExpenses)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3 mt-3">
        <div>
          <p className="text-xs font-ui text-muted">Profit</p>
          <p className={`font-heading text-xl font-semibold tabular-nums ${summary.profit >= 0 ? 'text-success' : 'text-error'}`}>
            {fmt(summary.profit)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-ui text-muted">Margin</p>
          <p className={`font-heading text-xl font-semibold tabular-nums ${summary.profitMargin >= 0 ? 'text-success' : 'text-error'}`}>
            {Math.round(summary.profitMargin * 100)}%
          </p>
        </div>
      </div>

      <div className="text-xs font-body text-muted border-t border-border pt-3 mt-4">
        Annual salary reference: {fmt(summary.annualSalary)} — Salary component only; quarterly distributions are tracked separately.
      </div>
    </Card>
  )
}
