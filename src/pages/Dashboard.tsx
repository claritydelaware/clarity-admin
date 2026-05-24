import { useState, useMemo } from 'react'
import { AlertCircle, TrendingUp, Clock, DollarSign, Activity, Users, X, ArrowUp, ArrowDown } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { useDashboard } from '../hooks/useDashboard'
import { useCaseloadTrends } from '../hooks/useAnalytics'
import { useDateWindow } from '../hooks/useDateWindow'
import { formatCurrency } from '../lib/utils'
import { SkeletonMetricCards } from '../components/ui/Skeleton'
import type { Clinician, DateWindow } from '../types'

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
  const { window: dateWindow, setWindow, label: windowLabel, fromISO, toISO } = useDateWindow()
  const { data, isLoading, isError, error } = useDashboard(fromISO, toISO)
  const capacityAlerts = useCapacityAlerts()
  const [alertsDismissed, setAlertsDismissed] = useState(false)

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
          icon={<Activity size={16} />}
          label={`Sessions — ${windowLabel}`}
          value={String(cm.sessions)}
          sub={clinicians.map(c => `${c}: ${cm.sessionsByClinician[c]}`).join(' · ')}
          delta={pp ? <DeltaBadge current={cm.sessions} prior={pp.sessions} /> : undefined}
          accent
        />
        <MetricCard
          icon={<DollarSign size={16} />}
          label={`Revenue — ${windowLabel}`}
          value={formatCurrency(cm.revenue)}
          sub={clinicians.map(c => `${c}: ${formatCurrency(cm.revenueByClinician[c])}`).join(' · ')}
          delta={pp ? <DeltaBadge current={cm.revenue} prior={pp.revenue} /> : undefined}
        />
        <MetricCard
          icon={<Clock size={16} />}
          label="Pending (all time)"
          value={`${cm.pendingCount} claims`}
          sub={formatCurrency(cm.pendingAmount)}
          delta={pp ? <DeltaBadge current={cm.pendingCount} prior={pp.pendingCount} /> : undefined}
        />
        <MetricCard
          icon={<TrendingUp size={16} />}
          label={`Received — ${windowLabel}`}
          value={formatCurrency(cm.receivedAmount)}
          sub={null}
          delta={pp ? <DeltaBadge current={cm.receivedAmount} prior={pp.receivedAmount} /> : undefined}
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
          {clinicians.map(c => (
            <div key={c}>
              <div className="flex justify-between text-xs font-body mb-1">
                <span className="text-muted">{c}</span>
                <span className="font-medium text-ink">{cm.utilizationByClinician[c]}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, cm.utilizationByClinician[c])}%`,
                    backgroundColor: CLINICIAN_COLORS[c],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-heading text-sm font-semibold text-ink mb-4">Revenue Trend (6 months)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={sixMonthTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fontFamily: 'DM Sans' }} width={48} />
              <Tooltip formatter={(v: unknown) => formatCurrency(v as number)} contentStyle={{ fontSize: 12, fontFamily: 'DM Sans' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontFamily: 'DM Sans' }} />
              <Line type="monotone" dataKey="revenue" name="Total Revenue" stroke="#254D54" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-heading text-sm font-semibold text-ink mb-4">Payer Mix (this month)</h2>
          {payerMix.length === 0 ? (
            <p className="text-sm text-muted font-body py-8 text-center">No data for this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={payerMix} margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="payer" tick={{ fontSize: 10, fontFamily: 'DM Sans' }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fontFamily: 'DM Sans' }} width={48} />
                <Tooltip formatter={(v: unknown) => formatCurrency(v as number)} contentStyle={{ fontSize: 12, fontFamily: 'DM Sans' }} />
                <Bar dataKey="amount" name="Revenue" fill="#F6C54D" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Aging */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-heading text-sm font-semibold text-ink mb-4">Pending Claims Aging</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs font-medium text-muted uppercase tracking-wide">Bucket</th>
                <th className="text-right py-2 text-xs font-medium text-muted uppercase tracking-wide">Count</th>
                <th className="text-right py-2 text-xs font-medium text-muted uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {agingRows.map(row => (
                <tr key={row.label} className={row.danger ? 'bg-red-50' : ''}>
                  <td className={`py-2.5 font-medium ${row.danger ? 'text-error' : 'text-ink'}`}>{row.label}</td>
                  <td className={`py-2.5 text-right tabular-nums ${row.danger ? 'text-error' : 'text-muted'}`}>{row.count}</td>
                  <td className={`py-2.5 text-right tabular-nums font-medium ${row.danger ? 'text-error' : 'text-ink'}`}>{formatCurrency(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, sub, accent, delta }: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string | null
  accent?: boolean
  delta?: React.ReactNode
}) {
  return (
    <div className={`bg-white rounded-xl border p-5 ${accent ? 'border-l-4 border-l-gold border-y-gray-200 border-r-gray-200' : 'border-gray-200'}`}>
      <div className="flex items-center gap-1.5 text-muted mb-2">
        {icon}
        <span className="text-xs font-body uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="font-heading text-2xl font-semibold text-ink">{value}</p>
        {delta}
      </div>
      {sub && <p className="text-xs text-muted font-body mt-1 leading-relaxed">{sub}</p>}
    </div>
  )
}

function DateWindowSelector({ window, onChange }: { window: DateWindow; onChange: (w: DateWindow) => void }) {
  const options: DateWindow[] = ['mtd', 'qtd', 'ytd', 'last-month', 'last-quarter']
  return (
    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={[
            'px-2.5 py-1 rounded text-xs font-body transition-colors whitespace-nowrap',
            window === opt
              ? 'bg-teal text-white font-medium'
              : 'text-muted hover:text-ink hover:bg-gray-50',
          ].join(' ')}
        >
          {DATE_WINDOW_LABELS[opt]}
        </button>
      ))}
    </div>
  )
}
