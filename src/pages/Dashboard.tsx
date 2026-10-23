import { Activity, DollarSign, Clock, TrendingUp, ArrowDownToLine, Percent, CalendarClock } from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import { useDateWindow } from '../hooks/useDateWindow'
import { useCapacityAlerts, useCapacityAlertCollapse } from '../hooks/useCapacityAlerts'
import { useStaff } from '../hooks/useStaff'
import { useAttention } from '../hooks/useAttention'
import { formatCurrency, formatCurrencyWhole, formatCurrencyCompact } from '../lib/utils'
import { CLINICIAN_COLORS, COLORS } from '../lib/chartTheme'
import { SkeletonDashboard } from '../components/ui/Skeleton'
import MetricCard from '../components/ui/MetricCard'
import Tabs from '../components/ui/Tabs'
import ErrorBanner from '../components/ui/ErrorBanner'
import PageHeader from '../components/layout/PageHeader'
import ChartCard from '../components/charts/ChartCard'
import AreaChart from '../components/charts/AreaChart'
import CapacityAlert from '../components/dashboard/CapacityAlert'
import AttentionStrip from '../components/dashboard/AttentionStrip'
import UtilizationBars from '../components/dashboard/UtilizationBars'
import AgingList from '../components/dashboard/AgingList'
import PayerMixList from '../components/dashboard/PayerMixList'
import TrendChart from '../components/dashboard/TrendChart'
import { SessionsTooltip, RevenueTooltip, ReceivedTooltip } from '../components/dashboard/DashboardTooltips'
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

function vs(prior: string, label: string) {
  return label ? `vs ${prior} · ${label}` : `vs ${prior}`
}

function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="text-xs font-ui font-semibold uppercase tracking-wider text-ink">{children}</h2>
      {hint && <span className="text-xs font-body text-muted">{hint}</span>}
    </div>
  )
}

export default function Dashboard() {
  const { window: dateWindow, setWindow, label: windowLabel, fromISO, toISO } = useDateWindow()
  const { data, isLoading, isError, error } = useDashboard(fromISO, toISO, dateWindow)
  const capacityAlerts = useCapacityAlerts()
  const { collapsed: alertsCollapsed, toggleCollapsed: toggleAlertsCollapsed } = useCapacityAlertCollapse(capacityAlerts)
  const { data: staff } = useStaff()
  const { items: attentionItems, snoozed: snoozedItems, snooze, unsnooze } = useAttention()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          actions={<Tabs tabs={DATE_WINDOW_TABS} value={dateWindow} onChange={v => setWindow(v as DateWindow)} size="sm" />}
        />
        <SkeletonDashboard />
      </div>
    )
  }

  if (isError) return <ErrorBanner message={(error as Error).message} />
  if (!data) return null

  const { currentMonth: cm, priorPeriod: pp, priorPeriodLabel, priorPeriodFull: ppFull, priorPeriodFullLabel: ppFullLabel, sixMonthTrend, aging, payerMix } = data
  const priorLabel = priorPeriodLabel ?? ''

  const agingRows = [
    { label: '0–30 days',  ...aging.bucket0_30 },
    { label: '31–60 days', ...aging.bucket31_60 },
    { label: '61–90 days', ...aging.bucket61_90 },
    { label: '90+ days',   ...aging.bucket90plus },
  ]

  const targets = CLINICIANS.map(c => {
    const t = staff?.find(m => m.name.startsWith(c))?.targetCapacity
    return t ? `${c} ${t}/wk` : null
  })
  const utilSubtitle = targets.every(Boolean)
    ? `Share of weekly session target (${targets.join(' · ')}); the line marks 100%`
    : 'Share of weekly session target; the line marks 100%'

  const revenueSpark = sixMonthTrend.map(d => d.revenue)
  const sessionsSpark = sixMonthTrend.map(d => CLINICIANS.reduce((sum, c) => sum + (d.sessionsByClinician[c] ?? 0), 0))
  const avgRevenue = revenueSpark.length ? revenueSpark.reduce((a, b) => a + b, 0) / revenueSpark.length : 0

  const incoming = data.incomingPayments && data.incomingPayments.count > 0 ? data.incomingPayments : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={windowLabel}
        actions={<Tabs tabs={DATE_WINDOW_TABS} value={dateWindow} onChange={v => setWindow(v as DateWindow)} size="sm" />}
      />

      {capacityAlerts.length > 0 && (
        <CapacityAlert alerts={capacityAlerts} collapsed={alertsCollapsed} onToggleCollapsed={toggleAlertsCollapsed} />
      )}

      <AttentionStrip items={attentionItems} snoozed={snoozedItems} onSnooze={snooze} onRestore={unsnooze} />

      {/* Period metrics — follow the MTD/QTD/YTD selector */}
      <section className="space-y-3">
      <SectionLabel hint={windowLabel}>This period</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          index={0}
          icon={<Activity size={16} />}
          label="Sessions"
          value={String(cm.sessions)}
          caption={pp ? vs(String(pp.sessions), priorLabel) : undefined}
          delta={pp ? pctDelta(cm.sessions, pp.sessions) : null}
          sparkline={sessionsSpark}
          breakdown={CLINICIANS.map(c => ({ label: c, value: cm.sessionsByClinician[c], color: CLINICIAN_COLORS[c] }))}
          info="Completed sessions by service date. Excludes add-on (90785) and screening/testing codes."
          tooltipContent={pp ? <SessionsTooltip cm={cm} pp={pp} priorLabel={priorLabel} ppFull={ppFull} ppFullLabel={ppFullLabel} /> : undefined}
        />
        <MetricCard
          index={1}
          icon={<DollarSign size={16} />}
          label="Revenue"
          value={formatCurrencyWhole(cm.revenue)}
          caption={pp ? vs(formatCurrencyWhole(pp.revenue), priorLabel) : undefined}
          delta={pp ? pctDelta(cm.revenue, pp.revenue) : null}
          sparkline={revenueSpark}
          breakdown={CLINICIANS.map(c => ({ label: c, value: cm.revenueByClinician[c], color: CLINICIAN_COLORS[c], display: formatCurrencyCompact(cm.revenueByClinician[c]) }))}
          info="Billed value (client + insurance) of sessions with service dates in this period. Excludes denied claims. Not the same as cash received."
          tooltipContent={pp ? <RevenueTooltip cm={cm} pp={pp} priorLabel={priorLabel} ppFull={ppFull} ppFullLabel={ppFullLabel} /> : undefined}
        />
        <MetricCard
          index={2}
          icon={<TrendingUp size={16} />}
          label="Received"
          value={formatCurrencyWhole(cm.receivedAmount)}
          caption={pp ? vs(formatCurrencyWhole(pp.receivedAmount), priorLabel) : undefined}
          delta={pp ? pctDelta(cm.receivedAmount, pp.receivedAmount) : null}
          breakdown={cm.receivedByClinician
            ? CLINICIANS.map(c => ({ label: c, value: cm.receivedByClinician![c], color: CLINICIAN_COLORS[c], display: formatCurrencyCompact(cm.receivedByClinician![c]) }))
            : undefined}
          info="Cash actually received in this period, by payment date."
          tooltipContent={pp ? <ReceivedTooltip cm={cm} pp={pp} priorLabel={priorLabel} ppFull={ppFull} ppFullLabel={ppFullLabel} /> : undefined}
        />
        <MetricCard
          index={3}
          icon={<Percent size={16} />}
          label="Collection rate"
          value={data.collectionRate != null ? `${data.collectionRate}%` : '—'}
          sub="Received ÷ Revenue"
          info="Share of this period's revenue that has been collected so far. Rises as pending claims pay."
        />
      </div>
      </section>

      {/* Snapshot metrics — current state, unaffected by the period selector */}
      <section className="space-y-3">
      <SectionLabel hint="Current — not affected by the period selector">Right now</SectionLabel>
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${incoming ? 'xl:grid-cols-3' : 'xl:grid-cols-2'}`}>
        <MetricCard
          index={4}
          icon={<Clock size={16} />}
          label="Pending claims"
          value={String(cm.pendingCount)}
          sub={`${formatCurrencyWhole(cm.pendingAmount)} awaiting payment`}
        />
        {incoming && (
          <MetricCard
            index={5}
            icon={<ArrowDownToLine size={16} />}
            label="Incoming payments"
            value={formatCurrencyWhole(incoming.amount)}
            sub={`${incoming.count} claim${incoming.count !== 1 ? 's' : ''} — Payment Pending or future-dated`}
          />
        )}
        <MetricCard
          index={6}
          icon={<CalendarClock size={16} />}
          label="Avg days to payment"
          value={data.avgDaysToPayment != null ? `${data.avgDaysToPayment} days` : '—'}
          sub="Trailing 90 days"
        />
      </div>
      </section>

      {/* Utilization */}
      <ChartCard title="Utilization vs target" subtitle={utilSubtitle}>
        <UtilizationBars clinicians={CLINICIANS} values={cm.utilizationByClinician} />
      </ChartCard>

      {/* Revenue Trend + Aging side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <ChartCard title="Revenue trend" subtitle="Last 6 months · dashed line is the 6-month average" className="lg:col-span-3">
          <AreaChart
            series={[{ name: 'Revenue', data: revenueSpark }]}
            categories={sixMonthTrend.map(d => d.month)}
            colors={[COLORS.teal]}
            yFormatter={(v: number) => formatCurrencyCompact(v)}
            tooltipFormatter={(v: number) => formatCurrency(v)}
            options={{
              annotations: {
                yaxis: [{
                  y: avgRevenue,
                  borderColor: COLORS.mutedLight,
                  strokeDashArray: 4,
                  label: {
                    text: `Avg ${formatCurrencyCompact(avgRevenue)}`,
                    position: 'left',
                    offsetX: 60,
                    style: { background: 'transparent', color: COLORS.muted, fontSize: '10px' },
                  },
                }],
              },
            }}
          />
        </ChartCard>

        <ChartCard title="Pending claims aging" subtitle="Open balance by age" className="lg:col-span-2">
          <div className="-mx-5 -mb-5"><AgingList rows={agingRows} /></div>
        </ChartCard>
      </div>

      {/* Custom Trend Explorer */}
      <TrendChart />

      {/* Payer Mix */}
      <ChartCard title="Payer mix" subtitle="Revenue by payer · this month">
        {payerMix.length === 0 ? (
          <p className="text-sm text-muted font-body py-8 text-center">No data for this month.</p>
        ) : (
          <PayerMixList rows={payerMix.map(d => ({ payer: d.payer, amount: d.amount }))} />
        )}
      </ChartCard>
    </div>
  )
}
