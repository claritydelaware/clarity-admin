import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, AlertCircle, TrendingUp, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { useClaims } from '../hooks/useClaims'
import { useForecastAccuracy } from '../hooks/useAnalytics'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { formatCurrency, isArchived } from '../lib/utils'
import type { Claim, ForecastAccuracyWeek } from '../types'

interface WeekGroup {
  forecastWeek: string
  items: Claim[]
}

function ForecastWeekGroup({ forecastWeek, items, isOverdue }: WeekGroup & { isOverdue: boolean }) {
  const total = items.reduce((s, c) => s + c.totalPayment, 0)

  const weekLabel = (() => {
    const d = new Date(forecastWeek)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  })()

  return (
    <div className={`rounded-xl border overflow-hidden ${isOverdue ? 'border-red-200' : 'border-gray-200'}`}>
      {/* Week header */}
      <div className={`flex items-center justify-between px-5 py-3 ${isOverdue ? 'bg-red-50' : 'bg-teal-pale'}`}>
        <div className="flex items-center gap-2">
          {isOverdue && <span className="text-xs font-body font-medium text-error uppercase tracking-wide">Overdue</span>}
          <span className={`font-heading text-sm font-semibold ${isOverdue ? 'text-error' : 'text-teal'}`}>
            Week of {weekLabel}
          </span>
          <span className="text-xs text-muted font-body">({items.length} claim{items.length !== 1 ? 's' : ''})</span>
        </div>
        <span className={`font-heading text-sm font-semibold tabular-nums ${isOverdue ? 'text-error' : 'text-teal'}`}>
          {formatCurrency(total)}
        </span>
      </div>

      {/* Claims table */}
      <div className="bg-white">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-2 text-xs font-medium text-muted uppercase tracking-wide">Clinician</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted uppercase tracking-wide">Payer</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted uppercase tracking-wide">Code</th>
              <th className="text-right px-5 py-2 text-xs font-medium text-muted uppercase tracking-wide">Expected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(c => (
              <tr key={c.rowIndex} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-2.5 text-ink">{c.clinician}</td>
                <td className="px-4 py-2.5 text-muted">{c.insurance}</td>
                <td className="px-4 py-2.5 text-muted tabular-nums">{c.serviceCode}</td>
                <td className="px-5 py-2.5 text-right text-ink font-medium tabular-nums">
                  {formatCurrency(c.totalPayment)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ForecastAccuracySection() {
  const [open, setOpen] = useState(false)
  const { data: rawWeeks, isLoading } = useForecastAccuracy()

  const { settled, chartData, avgAccuracy } = useMemo(() => {
    if (!rawWeeks) return { settled: [], chartData: [], avgAccuracy: null }

    const s = rawWeeks
      .filter((w): w is ForecastAccuracyWeek & { actual: number; forecast: number } =>
        w.actual !== null && w.actual !== 0 && w.forecast !== null && w.forecast > 0
      )
      .slice(-12)

    const accuracyValues = s.map(w => 1 - Math.abs((w.difference ?? w.actual - w.forecast)) / w.forecast)
    const avg = accuracyValues.length
      ? accuracyValues.reduce((a, b) => a + b, 0) / accuracyValues.length
      : null

    const chart = s.map(w => {
      const d = new Date(w.weekStart + 'T00:00:00')
      return {
        week: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Forecast: w.forecast,
        Actual: w.actual,
      }
    })

    return { settled: s, chartData: chart, avgAccuracy: avg }
  }, [rawWeeks])

  const last8 = settled.slice(-8).reverse()

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="font-heading text-sm font-semibold text-ink">Forecast Accuracy</span>
          {avgAccuracy !== null && !open && (
            <span className="text-xs font-body text-muted">
              {(avgAccuracy * 100).toFixed(1)}% average accuracy
            </span>
          )}
        </div>
        {open ? <ChevronUp size={15} className="text-muted" /> : <ChevronDown size={15} className="text-muted" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-white px-5 pb-5 pt-4 space-y-5">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted text-sm font-body py-4">
              <Loader2 size={14} className="animate-spin" />
              Loading accuracy data…
            </div>
          ) : (
            <>
              {/* Summary stat */}
              {avgAccuracy !== null && (
                <p className="text-sm font-body text-ink">
                  <span className="font-semibold font-heading text-teal text-base">
                    {(avgAccuracy * 100).toFixed(1)}%
                  </span>
                  {' '}average forecast accuracy across {settled.length} settled week{settled.length !== 1 ? 's' : ''}.
                </p>
              )}

              {/* Chart */}
              {chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
                    <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fontFamily: 'DM Sans' }} width={48} />
                    <Tooltip
                      formatter={(v: unknown) => formatCurrency(v as number)}
                      contentStyle={{ fontSize: 12, fontFamily: 'DM Sans' }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontFamily: 'DM Sans' }} />
                    <Line type="monotone" dataKey="Forecast" stroke="#9CA3AF" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="Actual"   stroke="#254D54" strokeWidth={2}   dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {/* Table */}
              {last8.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-body">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Week', 'Forecast', 'Actual', 'Difference'].map(h => (
                          <th key={h} className="text-left py-2 text-xs font-medium text-muted uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {last8.map((w, i) => {
                        const diff = w.difference ?? (w.actual ?? 0) - (w.forecast ?? 0)
                        const d = new Date(w.weekStart + 'T00:00:00')
                        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        return (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="py-2.5 text-muted">{label}</td>
                            <td className="py-2.5 tabular-nums">{formatCurrency(w.forecast ?? 0)}</td>
                            <td className="py-2.5 tabular-nums">{formatCurrency(w.actual ?? 0)}</td>
                            <td className={`py-2.5 tabular-nums font-medium ${diff >= 0 ? 'text-success' : 'text-error'}`}>
                              {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {chartData.length === 0 && (
                <p className="text-sm text-muted font-body py-4 text-center">No settled weeks available yet.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function QuarterlyRollup({ claims }: { claims: Claim[] }) {
  const [open, setOpen] = useState(true)

  const { label, pendingCount, pendingAmount, overdueCount } = useMemo(() => {
    const now = new Date()
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    const qEnd   = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0)
    const q = Math.floor(now.getMonth() / 3) + 1
    const today = new Date(new Date().toDateString())

    const inQuarter = claims.filter(c => {
      if (!c.forecastWeek) return false
      const fw = new Date(c.forecastWeek)
      return fw >= qStart && fw <= qEnd
    })
    const overdue = claims.filter(c => c.forecastWeek && !isArchived(c) && new Date(c.forecastWeek) < today)

    return {
      label: `Q${q} ${now.getFullYear()}`,
      pendingCount: inQuarter.length,
      pendingAmount: inQuarter.reduce((s, c) => s + c.totalPayment, 0),
      overdueCount: overdue.length,
    }
  }, [claims])

  return (
    <div className="rounded-xl border border-teal/20 bg-teal-pale/30 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-teal-pale/50 transition-colors"
      >
        <span className="font-heading text-sm font-semibold text-teal">
          {label} Forecast
        </span>
        {open ? <ChevronUp size={15} className="text-teal" /> : <ChevronDown size={15} className="text-teal" />}
      </button>
      {open && (
        <div className="px-5 pb-4 flex flex-wrap gap-6">
          <div>
            <p className="text-xs font-body text-muted">Expected this quarter</p>
            <p className="font-heading text-xl font-semibold text-teal tabular-nums">{formatCurrency(pendingAmount)}</p>
            <p className="text-xs text-muted font-body mt-0.5">{pendingCount} pending claim{pendingCount !== 1 ? 's' : ''}</p>
          </div>
          {overdueCount > 0 && (
            <div>
              <p className="text-xs font-body text-muted">Overdue claims</p>
              <p className="font-heading text-xl font-semibold text-error tabular-nums">{overdueCount}</p>
              <p className="text-xs text-error font-body mt-0.5">forecast date passed</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Forecast() {
  const { data: claims, isLoading, isError, error } = useClaims({ status: 'Pending' })
  const queryClient = useQueryClient()
  const toast = useToast()
  const [recalcState, setRecalcState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [recalcCount, setRecalcCount] = useState(0)

  async function handleRecalculate() {
    setRecalcState('loading')
    try {
      const result = await api.maintenance.recalculateForecasts()
      setRecalcCount(result.updated)
      queryClient.invalidateQueries({ queryKey: ['claims'] })
      setRecalcState('done')
      toast.success(`Forecasts recalculated (${result.updated} updated)`)
      setTimeout(() => setRecalcState('idle'), 3000)
    } catch {
      setRecalcState('idle')
      toast.error('Recalculation failed — please try again')
    }
  }

  // Filter empty forecastWeek BEFORE sort — empty string produces Invalid Date
  // which sorts inconsistently across browsers
  const weeks = useMemo((): WeekGroup[] => {
    if (!claims) return []
    const valid = claims.filter(c => c.forecastWeek && !isArchived(c))
    const map = new Map<string, Claim[]>()
    for (const c of valid) {
      if (!map.has(c.forecastWeek)) map.set(c.forecastWeek, [])
      map.get(c.forecastWeek)!.push(c)
    }
    return [...map.entries()]
      .map(([forecastWeek, items]) => ({ forecastWeek, items }))
      .sort((a, b) => new Date(a.forecastWeek).getTime() - new Date(b.forecastWeek).getTime())
  }, [claims])

  // Midnight local time to avoid off-by-one at week boundaries
  const today = new Date(new Date().toDateString())
  const isOverdue = (forecastWeek: string) => new Date(forecastWeek) < today

  const totalExpected = weeks.reduce((s, w) => s + w.items.reduce((si, c) => si + c.totalPayment, 0), 0)
  const overdueAmount = weeks
    .filter(w => isOverdue(w.forecastWeek))
    .reduce((s, w) => s + w.items.reduce((si, c) => si + c.totalPayment, 0), 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm font-body">Loading forecast…</span>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold text-ink">Revenue Forecast</h1>
          <p className="text-xs text-muted font-body mt-1">Pending claims by expected payment week</p>
        </div>
        <div className="flex items-start gap-3">
          <button
            onClick={handleRecalculate}
            disabled={recalcState === 'loading'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-ui font-medium rounded-lg border border-teal text-teal hover:bg-teal-pale transition-colors disabled:opacity-50"
          >
            {recalcState === 'loading' ? (
              <><Loader2 size={12} className="animate-spin" />Recalculating…</>
            ) : recalcState === 'done' ? (
              <>Updated {recalcCount} claims</>
            ) : (
              <><RefreshCw size={12} />Recalculate Forecasts</>
            )}
          </button>
          {weeks.length > 0 && (
            <div className="text-right">
              <p className="font-heading text-xl font-semibold text-ink">{formatCurrency(totalExpected)}</p>
              <p className="text-xs text-muted font-body mt-0.5">total expected</p>
              {overdueAmount > 0 && (
                <p className="text-xs text-error font-body mt-0.5">{formatCurrency(overdueAmount)} overdue</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quarterly rollup */}
      {claims && claims.length > 0 && <QuarterlyRollup claims={claims} />}

      {/* Empty state */}
      {weeks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-gray-200">
          <TrendingUp size={32} className="text-muted mb-3 opacity-40" />
          <p className="text-sm font-body text-muted">No pending claims with forecast dates.</p>
        </div>
      )}

      {/* Week groups */}
      <div className="space-y-4">
        {weeks.map(w => (
          <ForecastWeekGroup
            key={w.forecastWeek}
            forecastWeek={w.forecastWeek}
            items={w.items}
            isOverdue={isOverdue(w.forecastWeek)}
          />
        ))}
      </div>

      {/* Accuracy section */}
      <ForecastAccuracySection />
    </div>
  )
}
