import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, AlertCircle, TrendingUp, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { useClaims } from '../hooks/useClaims'
import { useForecastAccuracy } from '../hooks/useAnalytics'
import { usePayerPerformance } from '../hooks/usePayerPerformance'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { formatCurrency, isArchived } from '../lib/utils'
import type { Claim, ForecastAccuracyWeek, PayerPerformance } from '../types'

interface WeekGroup {
  forecastWeek: string
  items: Claim[]
}

function daysOverdue(c: Claim): number {
  if (!c.forecastPaymentDate) return 0
  const forecast = new Date(c.forecastPaymentDate)
  const todayMidnight = new Date(new Date().toDateString())
  return Math.max(0, Math.round((todayMidnight.getTime() - forecast.getTime()) / 86400000))
}

function daysPending(c: Claim): number {
  const parts = c.claimDate.split('/')
  if (parts.length !== 3) return 0
  const claimDate = new Date(
    parseInt(parts[2], 10),
    parseInt(parts[0], 10) - 1,
    parseInt(parts[1], 10),
  )
  const todayMidnight = new Date(new Date().toDateString())
  return Math.max(0, Math.round((todayMidnight.getTime() - claimDate.getTime()) / 86400000))
}

function ForecastWeekGroup({ forecastWeek, items, isOverdue }: WeekGroup & { isOverdue: boolean }) {
  const [open, setOpen] = useState(isOverdue)
  const total = items.reduce((s, c) => s + c.insuranceAmount, 0)

  const weekLabel = (() => {
    const d = new Date(forecastWeek)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  })()

  return (
    <div className={`rounded-xl border overflow-hidden ${isOverdue ? 'border-red-200' : 'border-gray-200'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-3 text-left transition-colors ${
          isOverdue ? 'bg-red-50 hover:bg-red-100' : 'bg-teal-pale hover:bg-teal-pale/70'
        }`}
      >
        <div className="flex items-center gap-2">
          {isOverdue && <span className="text-xs font-body font-medium text-error uppercase tracking-wide">Overdue</span>}
          <span className={`font-heading text-sm font-semibold ${isOverdue ? 'text-error' : 'text-teal'}`}>
            Week of {weekLabel}
          </span>
          <span className="text-xs text-muted font-body">({items.length} claim{items.length !== 1 ? 's' : ''})</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-heading text-sm font-semibold tabular-nums ${isOverdue ? 'text-error' : 'text-teal'}`}>
            {formatCurrency(total)}
          </span>
          {open
            ? <ChevronUp size={14} className={isOverdue ? 'text-error' : 'text-teal'} />
            : <ChevronDown size={14} className={isOverdue ? 'text-error' : 'text-teal'} />
          }
        </div>
      </button>

      {open && (
        <div className="bg-white">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-2 text-xs font-medium text-muted uppercase tracking-wide">Clinician</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted uppercase tracking-wide">Payer</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted uppercase tracking-wide">Claim date</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted uppercase tracking-wide">Pending</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-muted uppercase tracking-wide">Expected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(c => (
                <tr key={c.rowIndex} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-2.5 text-ink">{c.clinician}</td>
                  <td className="px-4 py-2.5 text-muted">{c.insurance}</td>
                  <td className="px-4 py-2.5 text-muted tabular-nums">{c.serviceCode}</td>
                  <td className="px-4 py-2.5 text-muted tabular-nums">{c.claimDate}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-muted">
                      {daysPending(c)}d
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right text-ink font-medium tabular-nums">
                    {formatCurrency(c.insuranceAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function OverdueSection({ weeks }: { weeks: WeekGroup[] }) {
  const allOverdue = weeks.flatMap(w => w.items)
    .sort((a, b) => daysOverdue(b) - daysOverdue(a))
  const totalOverdueAmount = allOverdue.reduce((s, c) => s + c.insuranceAmount, 0)

  return (
    <div className="rounded-xl border border-red-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-red-50">
        <div className="flex items-center gap-2">
          <AlertCircle size={13} className="text-error shrink-0" />
          <span className="text-xs font-body font-medium text-error uppercase tracking-wide">
            Overdue — forecast date passed
          </span>
          <span className="text-xs text-error/70 font-body">
            ({allOverdue.length} claim{allOverdue.length !== 1 ? 's' : ''})
          </span>
        </div>
        <span className="font-heading text-sm font-semibold text-error tabular-nums">
          {formatCurrency(totalOverdueAmount)}
        </span>
      </div>

      <div className="bg-white">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="border-b border-red-100">
              <th className="text-left px-5 py-2 text-xs font-medium text-muted uppercase tracking-wide">Clinician</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted uppercase tracking-wide">Payer</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted uppercase tracking-wide">Code</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted uppercase tracking-wide">Claim date</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted uppercase tracking-wide">Overdue</th>
              <th className="text-right px-5 py-2 text-xs font-medium text-muted uppercase tracking-wide">Expected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-red-50">
            {allOverdue.map(c => (
              <tr key={c.rowIndex} className="hover:bg-red-50/40 transition-colors">
                <td className="px-5 py-2.5 text-ink">{c.clinician}</td>
                <td className="px-4 py-2.5 text-muted">{c.insurance}</td>
                <td className="px-4 py-2.5 text-muted tabular-nums">{c.serviceCode}</td>
                <td className="px-4 py-2.5 text-muted tabular-nums">{c.claimDate}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-error">
                    {daysOverdue(c)}d
                  </span>
                </td>
                <td className="px-5 py-2.5 text-right text-ink font-medium tabular-nums">
                  {formatCurrency(c.insuranceAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ForecastKpiStrip({
  totalExpected, totalCount,
  overdueAmount, overdueCount,
  next30Amount, next30Count,
  avgAccuracy,
}: {
  totalExpected: number
  totalCount: number
  overdueAmount: number
  overdueCount: number
  next30Amount: number
  next30Count: number
  avgAccuracy: number | null
}) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5">
        <p className="text-xs font-body uppercase tracking-wide text-muted mb-1">Total pipeline</p>
        <p className="font-heading text-xl font-semibold text-ink tabular-nums">{formatCurrency(totalExpected)}</p>
        <p className="text-xs text-muted font-body mt-1">{totalCount} pending claim{totalCount !== 1 ? 's' : ''}</p>
      </div>

      <div className="bg-white rounded-xl border border-red-200 px-4 py-3.5">
        <p className="text-xs font-body uppercase tracking-wide text-error mb-1 flex items-center gap-1">
          <AlertCircle size={11} /> Overdue
        </p>
        <p className="font-heading text-xl font-semibold text-error tabular-nums">{formatCurrency(overdueAmount)}</p>
        <p className="text-xs text-error/70 font-body mt-1">{overdueCount} claim{overdueCount !== 1 ? 's' : ''} past forecast date</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5">
        <p className="text-xs font-body uppercase tracking-wide text-muted mb-1">Due next 30 days</p>
        <p className="font-heading text-xl font-semibold text-ink tabular-nums">{formatCurrency(next30Amount)}</p>
        <p className="text-xs text-muted font-body mt-1">{next30Count} claim{next30Count !== 1 ? 's' : ''}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5">
        <p className="text-xs font-body uppercase tracking-wide text-muted mb-1">Forecast accuracy</p>
        {avgAccuracy !== null ? (
          <>
            <p className="font-heading text-xl font-semibold text-teal tabular-nums">
              {(avgAccuracy * 100).toFixed(1)}%
            </p>
            <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal rounded-full"
                style={{ width: `${Math.min(avgAccuracy * 100, 100).toFixed(1)}%` }}
              />
            </div>
            <p className="text-xs text-muted font-body mt-1.5">12-week avg · improving over time</p>
          </>
        ) : (
          <p className="font-heading text-xl font-semibold text-muted">—</p>
        )}
      </div>
    </div>
  )
}

function QuarterBanner({ label, collected, remaining, pendingCount }: {
  label: string
  collected: number
  remaining: number
  pendingCount: number
}) {
  return (
    <div className="rounded-xl border border-teal/20 bg-teal-pale/30 px-5 py-3 flex items-center gap-6">
      <p className="text-xs font-body text-teal font-medium uppercase tracking-wide shrink-0">{label}</p>
      <div className="h-7 w-px bg-teal/15 shrink-0" />
      <div className="shrink-0">
        <p className="text-xs font-body text-muted">Collected</p>
        <p className="font-heading text-lg font-semibold text-success tabular-nums">{formatCurrency(collected)}</p>
      </div>
      <div className="shrink-0">
        <p className="text-xs font-body text-muted">Remaining</p>
        <p className="font-heading text-lg font-semibold text-teal tabular-nums">{formatCurrency(remaining)}</p>
      </div>
      <p className="text-sm text-teal/60 font-body ml-auto">
        {pendingCount} claim{pendingCount !== 1 ? 's' : ''} pending this quarter
      </p>
    </div>
  )
}

function buildPayerRows(claims: Claim[], payerPerf: PayerPerformance[]) {
  const map = new Map<string, { amount: number; count: number }>()
  for (const c of claims) {
    const existing = map.get(c.insurance) ?? { amount: 0, count: 0 }
    map.set(c.insurance, { amount: existing.amount + c.insuranceAmount, count: existing.count + 1 })
  }
  const sorted = [...map.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([payer, { amount, count }]) => {
      const perf = payerPerf.find(p => p.payer === payer)
      return { payer, amount, count, avgDays: perf?.avgDaysToPay ?? null }
    })
  const grandTotal = sorted.reduce((s, r) => s + r.amount, 0)
  return { rows: sorted, grandTotal }
}

function PayerPipelinePanel({ claims, payerPerf }: {
  claims: Claim[]
  payerPerf: PayerPerformance[]
}) {
  const { rows, grandTotal } = useMemo(
    () => buildPayerRows(claims, payerPerf),
    [claims, payerPerf],
  )

  const TOP_N = 6
  const topRows = rows.slice(0, TOP_N)
  const otherRows = rows.slice(TOP_N)
  const otherTotal = otherRows.reduce((s, r) => s + r.amount, 0)
  const otherCount = otherRows.reduce((s, r) => s + r.count, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="font-heading text-sm font-semibold text-ink mb-3">Pipeline by payer</h2>
      <div className="space-y-3">
        {topRows.map(row => (
          <div key={row.payer}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-body text-ink truncate">{row.payer}</p>
                {row.avgDays !== null && (
                  <p className="text-xs text-muted font-body">avg {Math.round(row.avgDays)}d to pay</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-body font-medium text-ink tabular-nums">{formatCurrency(row.amount)}</p>
                <p className="text-xs text-muted font-body">{row.count} claim{row.count !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal rounded-full"
                style={{ width: grandTotal > 0 ? `${(row.amount / grandTotal * 100).toFixed(1)}%` : '0%' }}
              />
            </div>
          </div>
        ))}
        {otherRows.length > 0 && (
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-body text-muted">
                  Others <span className="text-xs">({otherRows.length} payers)</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-body text-muted tabular-nums">{formatCurrency(otherTotal)}</p>
                <p className="text-xs text-muted font-body">{otherCount} claims</p>
              </div>
            </div>
            <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-300 rounded-full"
                style={{ width: grandTotal > 0 ? `${(otherTotal / grandTotal * 100).toFixed(1)}%` : '0%' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AccuracySidebarPanel({
  settledWeeks,
  avgAccuracy,
}: {
  settledWeeks: (ForecastAccuracyWeek & { actual: number; forecast: number })[]
  avgAccuracy: number | null
}) {
  if (settledWeeks.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-heading text-sm font-semibold text-ink">Recent accuracy</h2>
        {avgAccuracy !== null && (
          <span className="text-xs font-body text-teal font-medium tabular-nums">
            {(avgAccuracy * 100).toFixed(1)}% avg
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {settledWeeks.map((w, i) => {
          const diff = w.difference ?? (w.actual - w.forecast)
          const d = new Date(w.weekStart + 'T00:00:00')
          const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          return (
            <div key={i} className="flex items-center justify-between text-xs font-body py-1 border-b border-gray-50 last:border-0">
              <span className="text-muted w-12 shrink-0">{label}</span>
              <span className={`tabular-nums font-medium ${diff >= 0 ? 'text-success' : 'text-error'}`}>
                {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted font-body mt-3 leading-relaxed">
        Historical forecasts may predate the current algorithm. Accuracy improves as more claims settle under the current logic.
      </p>
    </div>
  )
}

export default function Forecast() {
  const { data: claims, isLoading, isError, error } = useClaims({ status: 'Pending' })
  const { data: rawAccuracyWeeks } = useForecastAccuracy()
  const { data: payerPerf = [] } = usePayerPerformance()
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

  const today = new Date(new Date().toDateString())
  const isOverdueWeek = (forecastWeek: string) => new Date(forecastWeek) < today

  const totalExpected = weeks.reduce((s, w) => s + w.items.reduce((si, c) => si + c.insuranceAmount, 0), 0)
  const overdueAmount = weeks
    .filter(w => isOverdueWeek(w.forecastWeek))
    .reduce((s, w) => s + w.items.reduce((si, c) => si + c.insuranceAmount, 0), 0)

  const overdueWeeks  = weeks.filter(w => isOverdueWeek(w.forecastWeek))
  const upcomingWeeks = weeks.filter(w => !isOverdueWeek(w.forecastWeek))

  const overdueCount = overdueWeeks.reduce((s, w) => s + w.items.length, 0)
  const totalCount   = weeks.reduce((s, w) => s + w.items.length, 0)

  const thirtyDaysOut = new Date(today)
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)
  const next30Weeks = upcomingWeeks.filter(w => {
    const fw = new Date(w.forecastWeek)
    return fw >= today && fw <= thirtyDaysOut
  })
  const next30Amount = next30Weeks.reduce((s, w) => s + w.items.reduce((si, c) => si + c.insuranceAmount, 0), 0)
  const next30Count  = next30Weeks.reduce((s, w) => s + w.items.length, 0)

  const { avgAccuracy, settledWeeks } = useMemo(() => {
    if (!rawAccuracyWeeks) return { avgAccuracy: null, settledWeeks: [] }

    const settled = rawAccuracyWeeks
      .filter((w): w is ForecastAccuracyWeek & { actual: number; forecast: number } =>
        w.actual !== null && w.actual !== 0 && w.forecast !== null && w.forecast > 0,
      )
      .slice(-12)

    const accuracyValues = settled.map(w =>
      1 - Math.abs(w.difference ?? (w.actual - w.forecast)) / w.forecast,
    )
    const avg = accuracyValues.length
      ? accuracyValues.reduce((a, b) => a + b, 0) / accuracyValues.length
      : null

    return {
      avgAccuracy: avg,
      settledWeeks: settled.slice(-5).reverse(),
    }
  }, [rawAccuracyWeeks])

  const now = new Date()
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  const qEnd   = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0)
  const qLabel = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`

  // Collected: Payment Received or Payment Pending claims with paymentDateReceived in the quarter
  const qCollected = (claims ?? []).reduce((sum, c) => {
    if (c.status !== 'Payment Received' && c.status !== 'Payment Pending') return sum
    if (!c.paymentDateReceived) return sum
    const parts = c.paymentDateReceived.split('/')
    if (parts.length !== 3) return sum
    const d = new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10))
    return (d >= qStart && d <= qEnd) ? sum + c.totalPayment : sum
  }, 0)

  // Remaining: non-archived (pending) claims with forecastWeek in the quarter
  const qRemainingClaims = (claims ?? []).filter(c => {
    if (!c.forecastWeek || isArchived(c)) return false
    const fw = new Date(c.forecastWeek)
    return fw >= qStart && fw <= qEnd
  })
  const qForecastRemaining = qRemainingClaims.reduce((s, c) => s + c.insuranceAmount, 0)
  const qPendingCount      = qRemainingClaims.length

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
    <div className="space-y-5">
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

      {/* KPI strip */}
      <ForecastKpiStrip
        totalExpected={totalExpected}
        totalCount={totalCount}
        overdueAmount={overdueAmount}
        overdueCount={overdueCount}
        next30Amount={next30Amount}
        next30Count={next30Count}
        avgAccuracy={avgAccuracy}
      />

      {/* Quarter banner */}
      {(claims?.length ?? 0) > 0 && (
        <QuarterBanner label={qLabel} collected={qCollected} remaining={qForecastRemaining} pendingCount={qPendingCount} />
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-[1fr_288px] gap-4 items-start">
        {/* LEFT — main timeline column */}
        <div className="space-y-4">
          {overdueWeeks.length > 0 && <OverdueSection weeks={overdueWeeks} />}

          {upcomingWeeks.length > 0 && (
            <p className="text-xs font-body uppercase tracking-wide text-muted pt-2">Upcoming weeks</p>
          )}

          {upcomingWeeks.map(w => (
            <ForecastWeekGroup key={w.forecastWeek} forecastWeek={w.forecastWeek} items={w.items} isOverdue={false} />
          ))}

          {weeks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-gray-200">
              <TrendingUp size={32} className="text-muted mb-3 opacity-40" />
              <p className="text-sm font-body text-muted">No pending claims with forecast dates.</p>
            </div>
          )}
        </div>

        {/* RIGHT — sidebar */}
        <div className="space-y-4">
          <PayerPipelinePanel claims={claims ?? []} payerPerf={payerPerf} />
          <AccuracySidebarPanel settledWeeks={settledWeeks} avgAccuracy={avgAccuracy} />
        </div>
      </div>
    </div>
  )
}
