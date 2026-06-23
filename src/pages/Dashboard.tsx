import { useState } from 'react'
import { Activity, DollarSign, Clock, TrendingUp, ArrowDownToLine, Percent, CalendarClock } from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import { useDateWindow } from '../hooks/useDateWindow'
import { useCapacityAlerts } from '../hooks/useCapacityAlerts'
import { formatCurrency, getPayerStyle, CLINICIAN_COLORS } from '../lib/utils'
import { SkeletonMetricCards } from '../components/ui/Skeleton'
import MetricCard from '../components/ui/MetricCard'
import Tabs from '../components/ui/Tabs'
import ProgressBar from '../components/ui/ProgressBar'
import ErrorBanner from '../components/ui/ErrorBanner'
import PageHeader from '../components/layout/PageHeader'
import ChartCard from '../components/charts/ChartCard'
import AreaChart from '../components/charts/AreaChart'
import BarChart from '../components/charts/BarChart'
import CapacityAlert from '../components/dashboard/CapacityAlert'
import { SessionsTooltip, RevenueTooltip, PendingTooltip, ReceivedTooltip } from '../components/dashboard/DashboardTooltips'
import type { Clinician, DateWindow } from '../types'

const DATE_WINDOW_TABS = [
  { value: 'mtd', label: 'MTD' },
  { value: 'qtd', label: 'QTD' },
  { value: 'ytd', label: 'YTD' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'last-quarter', label: 'Last Quarter' },
]

const CLINICIANS: Clinician[] = ['Shannon', 'Jen', 'Emily', 'Shana']

function pctDelta(current: number, prior: number): number | null {
  if (prior === 0) return null
  const pct = Math.round(((current - prior) / prior) * 100)
  return isNaN(pct) || !isFinite(pct) ? null : pct
}

export default function Dashboard() {
  const { window: dateWindow, setWindow, label: windowLabel, priorLabel, fromISO, toISO } = useDateWindow()
  const { data, isLoading, isError, error } = useDashboard(fromISO, toISO, dateWindow)
  const capacityAlerts = useCapacityAlerts()
  const [alertsDismissed, setAlertsDismissed] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          actions={<Tabs tabs={DATE_WINDOW_TABS} value={dateWindow} onChange={v => setWindow(v as DateWindow)} size="sm" />}
        />
        <SkeletonMetricCards />
      </div>
    )
  }

  if (isError) return <ErrorBanner message={(error as Error).message} />
  if (!data) return null

  const { currentMonth: cm, priorPeriod: pp, sixMonthTrend, aging, payerMix } = data

  const agingRows = [
    { label: '0–30 days',  ...aging.bucket0_30,  danger: false },
    { label: '31–60 days', ...aging.bucket31_60, danger: false },
    { label: '61–90 days', ...aging.bucket61_90, danger: false },
    { label: '90+ days',   ...aging.bucket90plus, danger: aging.bucket90plus.total > 0 },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={windowLabel}
        actions={<Tabs tabs={DATE_WINDOW_TABS} value={dateWindow} onChange={v => setWindow(v as DateWindow)} size="sm" />}
      />

      {!alertsDismissed && capacityAlerts.length > 0 && (
        <CapacityAlert alerts={capacityAlerts} onDismiss={() => setAlertsDismissed(true)} />
      )}

      {/* Primary metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          index={0}
          icon={<Activity size={16} />}
          label={`Sessions — ${windowLabel}`}
          value={String(cm.sessions)}
          sub={CLINICIANS.map(c => `${c}: ${cm.sessionsByClinician[c]}`).join(' · ')}
          delta={pp ? pctDelta(cm.sessions, pp.sessions) : null}
          tooltipContent={pp ? <SessionsTooltip cm={cm} pp={pp} priorLabel={priorLabel} /> : undefined}
        />
        <MetricCard
          index={1}
          icon={<DollarSign size={16} />}
          label={`Revenue — ${windowLabel}`}
          value={formatCurrency(cm.revenue)}
          sub={CLINICIANS.map(c => `${c}: ${formatCurrency(cm.revenueByClinician[c])}`).join(' · ')}
          delta={pp ? pctDelta(cm.revenue, pp.revenue) : null}
          tooltipContent={pp ? <RevenueTooltip cm={cm} pp={pp} priorLabel={priorLabel} /> : undefined}
        />
        <MetricCard
          index={2}
          icon={<Clock size={16} />}
          label="Pending (all time)"
          value={`${cm.pendingCount} claims`}
          sub={formatCurrency(cm.pendingAmount)}
          delta={pp ? pctDelta(cm.pendingCount, pp.pendingCount) : null}
          tooltipContent={<PendingTooltip aging={data.aging} />}
        />
        <MetricCard
          index={3}
          icon={<TrendingUp size={16} />}
          label={`Received — ${windowLabel}`}
          value={formatCurrency(cm.receivedAmount)}
          delta={pp ? pctDelta(cm.receivedAmount, pp.receivedAmount) : null}
          tooltipContent={pp ? <ReceivedTooltip cm={cm} pp={pp} priorLabel={priorLabel} /> : undefined}
        />
      </div>

      {/* Secondary metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data.incomingPayments && data.incomingPayments.count > 0 && (
          <MetricCard
            index={0}
            icon={<ArrowDownToLine size={16} />}
            label="Incoming Payments"
            value={formatCurrency(data.incomingPayments.amount)}
            sub={`${data.incomingPayments.count} claim${data.incomingPayments.count !== 1 ? 's' : ''} — Payment Pending or future-dated`}
          />
        )}
        <MetricCard
          index={1}
          icon={<Percent size={16} />}
          label={`Collection Rate — ${windowLabel}`}
          value={data.collectionRate != null ? `${data.collectionRate}%` : '—'}
          sub="Received ÷ Revenue"
        />
        <MetricCard
          index={2}
          icon={<CalendarClock size={16} />}
          label="Avg Days to Payment"
          value={data.avgDaysToPayment != null ? `${data.avgDaysToPayment} days` : '—'}
          sub="Last 90 days"
        />
      </div>

      {/* Utilization */}
      <ChartCard title="Utilization vs Target" subtitle="Shannon/Jen: 25 sessions/wk · Emily: 10 sessions/wk · Shana: 20 sessions/wk">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {CLINICIANS.map(c => (
            <ProgressBar
              key={c}
              value={Math.min(100, cm.utilizationByClinician[c])}
              label={c}
              color={CLINICIAN_COLORS[c]}
              size="sm"
            />
          ))}
        </div>
      </ChartCard>

      {/* Revenue Trend + Aging side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <ChartCard title="Revenue Trend" className="lg:col-span-3">
          <AreaChart
            series={[{ name: 'Revenue', data: sixMonthTrend.map(d => d.revenue) }]}
            categories={sixMonthTrend.map(d => d.month)}
            colors={['#254D54']}
            yFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            tooltipFormatter={(v: number) => formatCurrency(v)}
          />
        </ChartCard>

        <div className="lg:col-span-2 bg-surface rounded-xl border border-border shadow-card">
          <div className="px-5 py-4">
            <h3 className="text-sm font-semibold font-heading text-ink">Pending Claims Aging</h3>
          </div>
          <div className="divide-y divide-border">
            {agingRows.map(row => (
              <div key={row.label} className="flex items-center justify-between py-3 px-5">
                <p className={`text-sm font-medium font-body ${row.danger ? 'text-error' : 'text-ink'}`}>{row.label}</p>
                <div className="flex items-center gap-4">
                  <p className={`text-sm tabular-nums font-body ${row.danger ? 'text-error' : 'text-muted'}`}>
                    {row.count} claim{row.count !== 1 ? 's' : ''}
                  </p>
                  <p className={`text-sm font-medium tabular-nums font-body min-w-20 text-right ${row.danger ? 'text-error' : 'text-ink'}`}>
                    {formatCurrency(row.total)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payer Mix */}
      <ChartCard title="Payer Mix" subtitle="This month">
        {payerMix.length === 0 ? (
          <p className="text-sm text-muted font-body py-8 text-center">No data for this month.</p>
        ) : (
          <BarChart
            series={[{ name: 'Revenue', data: payerMix.map(d => d.amount) }]}
            categories={payerMix.map(d => d.payer)}
            colors={payerMix.map(d => getPayerStyle(d.payer).backgroundColor)}
            distributed
            yFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            tooltipFormatter={(v: number) => formatCurrency(v)}
            options={{
              xaxis: { labels: { rotate: -35, style: { fontSize: '10px' } } },
            }}
          />
        )}
      </ChartCard>
    </div>
  )
}
