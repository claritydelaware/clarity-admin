import { formatCurrency } from '../../lib/utils'
import type { Clinician, DashboardPeriodMetrics, DashboardData } from '../../types'

const CLINICIANS: Clinician[] = ['Shannon', 'Jen', 'Emily', 'Shana']

function TooltipRow({ label, current, prior, highlight }: {
  label: string; current: string; prior: string; highlight?: boolean
}) {
  return (
    <tr className={highlight ? 'text-error' : ''}>
      <td className="py-1 pr-4 text-muted whitespace-nowrap">{label}</td>
      <td className="py-1 pr-3 text-right tabular-nums font-medium text-ink">{current}</td>
      <td className="py-1 text-right tabular-nums text-muted">{prior}</td>
    </tr>
  )
}

function TooltipTable({ children, priorLabel }: { children: React.ReactNode; priorLabel: string }) {
  return (
    <div className="text-xs font-body">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-muted font-medium">{priorLabel}</div>
      <div className="px-3 py-2">
        <table className="w-full">
          <thead>
            <tr>
              <th className="pb-1 text-left text-muted font-normal"></th>
              <th className="pb-1 text-right text-muted font-normal pr-3">This period</th>
              <th className="pb-1 text-right text-muted font-normal">Prior</th>
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  )
}

export function SessionsTooltip({ cm, pp, priorLabel }: {
  cm: DashboardPeriodMetrics; pp: DashboardPeriodMetrics; priorLabel: string
}) {
  return (
    <TooltipTable priorLabel={priorLabel}>
      <TooltipRow label="Total" current={String(cm.sessions)} prior={String(pp.sessions)} />
      {CLINICIANS.map(c => (
        <TooltipRow key={c} label={c} current={String(cm.sessionsByClinician[c])} prior={String(pp.sessionsByClinician[c])} />
      ))}
    </TooltipTable>
  )
}

export function RevenueTooltip({ cm, pp, priorLabel }: {
  cm: DashboardPeriodMetrics; pp: DashboardPeriodMetrics; priorLabel: string
}) {
  const rps      = cm.sessions > 0 ? cm.revenue / cm.sessions : 0
  const priorRps = pp.sessions > 0 ? pp.revenue / pp.sessions : 0
  return (
    <div className="text-xs font-body">
      <TooltipTable priorLabel={priorLabel}>
        <TooltipRow label="Total" current={formatCurrency(cm.revenue)} prior={formatCurrency(pp.revenue)} />
        {CLINICIANS.map(c => (
          <TooltipRow key={c} label={c} current={formatCurrency(cm.revenueByClinician[c])} prior={formatCurrency(pp.revenueByClinician[c])} />
        ))}
      </TooltipTable>
      <div className="px-3 py-2 border-t border-gray-100 flex justify-between text-muted">
        <span>Rev / session</span>
        <span className="tabular-nums text-ink font-medium">
          {formatCurrency(rps)} <span className="text-muted font-normal">vs {formatCurrency(priorRps)}</span>
        </span>
      </div>
    </div>
  )
}

export function PendingTooltip({ aging }: { aging: DashboardData['aging'] }) {
  const buckets = [
    { label: '0–30 days',  ...aging.bucket0_30,  danger: false },
    { label: '31–60 days', ...aging.bucket31_60, danger: false },
    { label: '61–90 days', ...aging.bucket61_90, danger: false },
    { label: '90+ days',   ...aging.bucket90plus, danger: aging.bucket90plus.count > 0 },
  ]
  return (
    <div className="text-xs font-body">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-muted font-medium">Aging breakdown</div>
      <div className="px-3 py-2">
        <table className="w-full">
          <thead>
            <tr>
              <th className="pb-1 text-left text-muted font-normal">Age</th>
              <th className="pb-1 text-right text-muted font-normal pr-3">Claims</th>
              <th className="pb-1 text-right text-muted font-normal">Value</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map(b => (
              <tr key={b.label} className={b.danger ? 'text-error' : ''}>
                <td className="py-1 pr-4 whitespace-nowrap">{b.label}</td>
                <td className={`py-1 pr-3 text-right tabular-nums font-medium ${b.danger ? '' : 'text-ink'}`}>{b.count}</td>
                <td className={`py-1 text-right tabular-nums ${b.danger ? '' : 'text-muted'}`}>{formatCurrency(b.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ReceivedTooltip({ cm, pp, priorLabel }: {
  cm: DashboardPeriodMetrics; pp: DashboardPeriodMetrics; priorLabel: string
}) {
  const diff = cm.receivedAmount - pp.receivedAmount
  const collectionRate      = cm.revenue > 0 ? (cm.receivedAmount / cm.revenue) * 100 : null
  const priorCollectionRate = pp.revenue > 0 ? (pp.receivedAmount / pp.revenue) * 100 : null
  return (
    <div className="text-xs font-body">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-muted font-medium">{priorLabel}</div>
      <div className="px-3 py-2 space-y-1">
        <div className="flex justify-between">
          <span className="text-muted">This period</span>
          <span className="tabular-nums font-medium text-ink">{formatCurrency(cm.receivedAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Prior period</span>
          <span className="tabular-nums text-muted">{formatCurrency(pp.receivedAmount)}</span>
        </div>
        <div className="flex justify-between pt-1 border-t border-gray-100">
          <span className="text-muted">Difference</span>
          <span className={`tabular-nums font-medium ${diff >= 0 ? 'text-success' : 'text-error'}`}>
            {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
          </span>
        </div>
      </div>
      {collectionRate !== null && priorCollectionRate !== null && (
        <div className="px-3 py-2 border-t border-gray-100 flex justify-between text-muted">
          <span>Collection rate</span>
          <span className="tabular-nums text-ink font-medium">
            {collectionRate.toFixed(1)}%{' '}
            <span className="text-muted font-normal">vs {priorCollectionRate.toFixed(1)}%</span>
          </span>
        </div>
      )}
    </div>
  )
}
