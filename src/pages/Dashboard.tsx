import { useState, useMemo, useRef, useEffect } from 'react'
import { AlertCircle, TrendingUp, Clock, DollarSign, Activity, Users, X, ArrowUp, ArrowDown } from 'lucide-react'
import ReactApexChart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { useDashboard } from '../hooks/useDashboard'
import { useCaseloadTrends } from '../hooks/useAnalytics'
import { useDateWindow } from '../hooks/useDateWindow'
import { formatCurrency, getPayerStyle } from '../lib/utils'
import { SkeletonMetricCards } from '../components/ui/Skeleton'
import UITooltip from '../components/ui/Tooltip'
import type { Clinician, DateWindow, DashboardPeriodMetrics, DashboardData } from '../types'

const CLINICIAN_COLORS: Record<Clinician, string> = {
  Shannon: '#254D54',
  Jen:     '#F6C54D',
  Emily:   '#3A7078',
}

const DATE_WINDOW_LABELS: Record<DateWindow, string> = {
  'mtd':          'MTD',
  'qtd':          'QTD',
  'ytd':          'YTD',
  'last-month':   'Last Month',
  'last-quarter': 'Last Quarter',
}

const baseOptions: ApexOptions = {
  chart: {
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: 'DM Sans, sans-serif',
    background: 'transparent',
    animations: { enabled: true, speed: 400 },
  },
  grid: {
    borderColor: '#E8F1F2',
    strokeDashArray: 4,
  },
  xaxis: {
    labels: { style: { fontSize: '11px', fontFamily: 'DM Sans, sans-serif' } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: { style: { fontSize: '11px', fontFamily: 'DM Sans, sans-serif' } },
  },
  tooltip: {
    style: { fontSize: '12px', fontFamily: 'DM Sans, sans-serif' },
  },
  legend: {
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '12px',
    markers: { size: 6 },
    itemMargin: { horizontal: 12, vertical: 8 },
  },
}

function useCapacityAlerts() {
  const { data: trends } = useCaseloadTrends()
  return useMemo(() => {
    if (!trends || trends.length < 2) return []
    const today = new Date()
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
    const complete = trends.filter(m => m.month < currentMonthStart)
    const last2 = complete.slice(-2)
    if (last2.length < 1) return []

    const avg = (vals: (number | null)[]): number | null => {
      const valid = vals.filter((v): v is number => v !== null)
      return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null
    }

    const alerts: { name: string; pct: number; level: 'warning' | 'danger' }[] = []
    const checks: { name: string; getter: (m: typeof last2[0]) => number | null }[] = [
      { name: 'Shannon', getter: m => m.shannonUtilPct },
      { name: 'Jen',     getter: m => m.jenUtilPct     },
      { name: 'Emily',   getter: m => m.emilyUtilPct   },
    ]
    for (const { name, getter } of checks) {
      const a = avg(last2.map(getter))
      if (a === null) continue
      if (a >= 100) alerts.push({ name, pct: a, level: 'danger' })
      else if (a >= 95) alerts.push({ name, pct: a, level: 'warning' })
    }
    return alerts
  }, [trends])
}

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

function SessionsTooltipContent({ cm, pp, priorLabel }: {
  cm: DashboardPeriodMetrics; pp: DashboardPeriodMetrics; priorLabel: string
}) {
  const clinicians: Clinician[] = ['Shannon', 'Jen', 'Emily']
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
          <tbody>
            <TooltipRow label="Total" current={String(cm.sessions)} prior={String(pp.sessions)} />
            {clinicians.map(c => (
              <TooltipRow key={c} label={c} current={String(cm.sessionsByClinician[c])} prior={String(pp.sessionsByClinician[c])} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RevenueTooltipContent({ cm, pp, priorLabel }: {
  cm: DashboardPeriodMetrics; pp: DashboardPeriodMetrics; priorLabel: string
}) {
  const clinicians: Clinician[] = ['Shannon', 'Jen', 'Emily']
  const rps      = cm.sessions > 0 ? cm.revenue / cm.sessions : 0
  const priorRps = pp.sessions > 0 ? pp.revenue / pp.sessions : 0
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
          <tbody>
            <TooltipRow label="Total" current={formatCurrency(cm.revenue)} prior={formatCurrency(pp.revenue)} />
            {clinicians.map(c => (
              <TooltipRow key={c} label={c} current={formatCurrency(cm.revenueByClinician[c])} prior={formatCurrency(pp.revenueByClinician[c])} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 border-t border-gray-100 flex justify-between text-muted">
        <span>Rev / session</span>
        <span className="tabular-nums text-ink font-medium">
          {formatCurrency(rps)} <span className="text-muted font-normal">vs {formatCurrency(priorRps)}</span>
        </span>
      </div>
    </div>
  )
}

function PendingTooltipContent({ aging }: { aging: DashboardData['aging'] }) {
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

function ReceivedTooltipContent({ cm, pp, priorLabel }: {
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

function DeltaBadge({ current, prior }: { current: number; prior: number }) {
  if (prior === 0) return null
  const pct = Math.round(((current - prior) / prior) * 100)
  if (isNaN(pct) || !isFinite(pct)) return null
  const up = pct >= 0
  return (
    <span className={[
      'inline-flex items-center gap-0.5 text-xs font-body font-medium',
      up ? 'text-success' : 'text-error',
    ].join(' ')}>
      {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {Math.abs(pct)}%
    </span>
  )
}

export default function Dashboard() {
  const { window: dateWindow, setWindow, label: windowLabel, priorLabel, fromISO, toISO } = useDateWindow()
  const { data, isLoading, isError, error } = useDashboard(fromISO, toISO, dateWindow)
  const capacityAlerts = useCapacityAlerts()
  const [alertsDismissed, setAlertsDismissed] = useState(false)
  const [barsMounted, setBarsMounted] = useState(false)
  useEffect(() => { setBarsMounted(true) }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-xl font-semibold text-ink">Dashboard</h1>
          <DateWindowSelector window={dateWindow} onChange={setWindow} />
        </div>
        <SkeletonMetricCards />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-error font-body">
        <AlertCircle size={16} className="shrink-0" />
        {(error as Error).message}
      </div>
    )
  }

  if (!data) return null

  const { currentMonth: cm, priorPeriod: pp, sixMonthTrend, aging, payerMix } = data
  const clinicians: Clinician[] = ['Shannon', 'Jen', 'Emily']

  const agingRows = [
    { label: '0–30 days',  ...aging.bucket0_30,  danger: false },
    { label: '31–60 days', ...aging.bucket31_60, danger: false },
    { label: '61–90 days', ...aging.bucket61_90, danger: false },
    { label: '90+ days',   ...aging.bucket90plus, danger: aging.bucket90plus.total > 0 },
  ]

  // Revenue trend chart options
  const trendSeries = [{ name: 'Revenue', data: sixMonthTrend.map(d => d.revenue) }]
  const trendOptions: ApexOptions = {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'area' },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.15, opacityTo: 0.02, stops: [0, 100] },
    },
    colors: ['#254D54'],
    xaxis: { ...baseOptions.xaxis, categories: sixMonthTrend.map(d => d.month) },
    yaxis: {
      ...baseOptions.yaxis,
      labels: { ...baseOptions.yaxis?.labels, formatter: (v: number) => `$${(v / 1000).toFixed(0)}k` },
    },
    dataLabels: { enabled: false },
    tooltip: { ...baseOptions.tooltip, y: { formatter: (v: number) => formatCurrency(v) } },
  }

  // Payer mix chart options
  const payerColors = payerMix.map(d => getPayerStyle(d.payer).backgroundColor)
  const payerSeries = [{ name: 'Revenue', data: payerMix.map(d => d.amount) }]
  const payerOptions: ApexOptions = {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'bar' },
    plotOptions: { bar: { distributed: true, borderRadius: 3, columnWidth: '60%' } },
    colors: payerColors,
    legend: { show: false },
    xaxis: {
      ...baseOptions.xaxis,
      categories: payerMix.map(d => d.payer),
      labels: { ...baseOptions.xaxis?.labels, rotate: -35, style: { fontSize: '10px', fontFamily: 'DM Sans, sans-serif' } },
    },
    yaxis: {
      ...baseOptions.yaxis,
      labels: { ...baseOptions.yaxis?.labels, formatter: (v: number) => `$${(v / 1000).toFixed(0)}k` },
    },
    dataLabels: { enabled: false },
    tooltip: { ...baseOptions.tooltip, y: { formatter: (v: number) => formatCurrency(v) } },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold text-ink">Dashboard</h1>
          <p className="text-xs font-body text-muted mt-0.5">{windowLabel}</p>
        </div>
        <DateWindowSelector window={dateWindow} onChange={setWindow} />
      </div>

      {/* Capacity alerts */}
      {!alertsDismissed && capacityAlerts.length > 0 && (
        <div className={`relative rounded-xl border px-5 py-4 pr-10 ${
          capacityAlerts.some(a => a.level === 'danger')
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <button
            onClick={() => setAlertsDismissed(true)}
            className="absolute top-3 right-3 text-muted hover:text-ink transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
          <p className={`text-xs font-body font-semibold uppercase tracking-wide mb-1 ${
            capacityAlerts.some(a => a.level === 'danger') ? 'text-error' : 'text-amber-700'
          }`}>
            Capacity Alert
          </p>
          <ul className="space-y-0.5">
            {capacityAlerts.map(a => (
              <li key={a.name} className={`text-sm font-body ${a.level === 'danger' ? 'text-error' : 'text-amber-800'}`}>
                {a.name} has been at {a.pct.toFixed(0)}% utilization over the last 2 months
                {a.level === 'danger' ? ' — over capacity, consider caseload review.' : ' — approaching capacity.'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          index={0}
          icon={<Activity size={16} />}
          label={`Sessions — ${windowLabel}`}
          value={String(cm.sessions)}
          sub={clinicians.map(c => `${c}: ${cm.sessionsByClinician[c]}`).join(' · ')}
          delta={pp ? <DeltaBadge current={cm.sessions} prior={pp.sessions} /> : undefined}
          tooltipContent={pp ? <SessionsTooltipContent cm={cm} pp={pp} priorLabel={priorLabel} /> : undefined}
        />
        <MetricCard
          index={1}
          icon={<DollarSign size={16} />}
          label={`Revenue — ${windowLabel}`}
          value={formatCurrency(cm.revenue)}
          sub={clinicians.map(c => `${c}: ${formatCurrency(cm.revenueByClinician[c])}`).join(' · ')}
          delta={pp ? <DeltaBadge current={cm.revenue} prior={pp.revenue} /> : undefined}
          tooltipContent={pp ? <RevenueTooltipContent cm={cm} pp={pp} priorLabel={priorLabel} /> : undefined}
        />
        <MetricCard
          index={2}
          icon={<Clock size={16} />}
          label="Pending (all time)"
          value={`${cm.pendingCount} claims`}
          sub={formatCurrency(cm.pendingAmount)}
          delta={pp ? <DeltaBadge current={cm.pendingCount} prior={pp.pendingCount} /> : undefined}
          tooltipContent={<PendingTooltipContent aging={data.aging} />}
        />
        <MetricCard
          index={3}
          icon={<TrendingUp size={16} />}
          label={`Received — ${windowLabel}`}
          value={formatCurrency(cm.receivedAmount)}
          sub={null}
          delta={pp ? <DeltaBadge current={cm.receivedAmount} prior={pp.receivedAmount} /> : undefined}
          tooltipContent={pp ? <ReceivedTooltipContent cm={cm} pp={pp} priorLabel={priorLabel} /> : undefined}
        />
      </div>

      {/* Utilization */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={15} className="text-muted" />
          <h2 className="font-heading text-sm font-semibold text-ink">Utilization vs Target</h2>
          <span className="text-xs text-muted font-body">(Shannon/Jen: 25 sessions/wk · Emily: 10 sessions/wk)</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {clinicians.map(c => {
            const pct = Math.min(100, cm.utilizationByClinician[c])
            return (
              <div key={c}>
                <div className="flex justify-between text-xs font-body mb-1">
                  <span className="text-muted">{c}</span>
                  <span className="font-medium text-ink">{cm.utilizationByClinician[c]}%</span>
                </div>
                <div className="mt-2 bg-gray-200 h-1.5 rounded-full relative">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: barsMounted ? `${pct}%` : '0%',
                      backgroundColor: CLINICIAN_COLORS[c],
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <p className="font-heading text-sm font-semibold text-ink">Revenue Trend</p>
          </div>
          <div className="px-5 pb-5">
            <ReactApexChart
              options={trendOptions}
              series={trendSeries}
              type="area"
              height={220}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <p className="font-heading text-sm font-semibold text-ink">Payer Mix</p>
            <span className="text-xs text-muted font-body">This month</span>
          </div>
          <div className="px-5 pb-5">
            {payerMix.length === 0 ? (
              <p className="text-sm text-muted font-body py-8 text-center">No data for this month.</p>
            ) : (
              <ReactApexChart
                options={payerOptions}
                series={payerSeries}
                type="bar"
                height={220}
              />
            )}
          </div>
        </div>
      </div>

      {/* Aging */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <p className="font-heading text-sm font-semibold text-ink">Pending Claims Aging</p>
        </div>
        <div className="divide-y divide-gray-200">
          {agingRows.map(row => (
            <div key={row.label} className="grid grid-cols-3 py-3 items-center">
              <div className="px-5">
                <p className={`text-sm font-medium font-body ${row.danger ? 'text-error' : 'text-ink'}`}>{row.label}</p>
              </div>
              <div className="px-4">
                <p className={`text-sm tabular-nums font-body ${row.danger ? 'text-error' : 'text-muted'}`}>{row.count}</p>
              </div>
              <div className="px-4 text-right">
                <p className={`text-sm font-medium tabular-nums font-body ${row.danger ? 'text-error' : 'text-ink'}`}>{formatCurrency(row.total)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, sub, delta, tooltipContent, index = 0 }: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string | null
  delta?: React.ReactNode
  tooltipContent?: React.ReactNode
  index?: number
}) {
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 px-5 py-4 animate-slide-up-fade"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-xs font-body uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-center justify-between mt-3">
        <p className="font-heading text-3xl font-light text-ink">{value}</p>
        {delta && tooltipContent ? (
          <UITooltip content={tooltipContent} variant="card" maxWidth={300}>
            {delta}
          </UITooltip>
        ) : delta}
      </div>
      {sub && <p className="text-xs text-muted font-body mt-1.5 leading-relaxed">{sub}</p>}
    </div>
  )
}

function DateWindowSelector({ window, onChange }: { window: DateWindow; onChange: (w: DateWindow) => void }) {
  const options: DateWindow[] = ['mtd', 'qtd', 'ytd', 'last-month', 'last-quarter']
  const containerRef = useRef<HTMLDivElement>(null)
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const idx = options.indexOf(window)
    const btns = containerRef.current.querySelectorAll('button')
    const btn = btns[idx] as HTMLButtonElement | undefined
    if (btn) setPillStyle({ left: btn.offsetLeft, width: btn.offsetWidth })
  }, [window])

  return (
    <div ref={containerRef} className="relative flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
      {pillStyle && (
        <div
          className="absolute bg-teal rounded pointer-events-none"
          style={{
            left: pillStyle.left,
            width: pillStyle.width,
            top: 4,
            bottom: 4,
            transition: 'left 0.2s ease-in-out, width 0.2s ease-in-out',
          }}
        />
      )}
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={[
            'relative z-10 px-2.5 py-1 rounded text-xs font-body transition-colors whitespace-nowrap',
            window === opt ? 'text-white font-medium' : 'text-muted hover:text-ink',
          ].join(' ')}
        >
          {DATE_WINDOW_LABELS[opt]}
        </button>
      ))}
    </div>
  )
}
