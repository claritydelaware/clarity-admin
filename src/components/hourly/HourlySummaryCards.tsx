import MetricCard from '../ui/MetricCard'
import { formatCurrency, CLINICIAN_COLORS } from '../../lib/utils'
import type { HourlyPerformanceHistory, HourlyPeriodHistoryEntry } from '../../types'

function summarize(entries: HourlyPeriodHistoryEntry[]) {
  const revenue = entries.reduce((s, e) => s + e.revenue, 0)
  const profit = entries.reduce((s, e) => s + e.profit, 0)
  const sessions = entries.reduce((s, e) => s + e.sessions, 0)
  const avgMargin = entries.length > 0
    ? entries.reduce((s, e) => s + e.profitMargin, 0) / entries.length
    : 0
  return { revenue, profit, sessions, avgMargin, periods: entries.length }
}

export default function HourlySummaryCards({ history }: { history: HourlyPerformanceHistory }) {
  const clinicians: Array<{ name: 'Emily' | 'Shana'; entries: HourlyPeriodHistoryEntry[] }> = [
    { name: 'Emily', entries: history.Emily },
    { name: 'Shana', entries: history.Shana },
  ]

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-base font-semibold text-ink">Since Hire — Summary</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {clinicians.map(({ name, entries }) => {
          if (entries.length === 0) return null
          const s = summarize(entries)
          return (
            <div key={name} className="space-y-2">
              <p className="text-xs font-ui font-medium uppercase tracking-wide text-muted">
                {name} — {s.periods} pay period{s.periods === 1 ? '' : 's'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label="Revenue Generated"
                  value={formatCurrency(s.revenue)}
                  accentColor={CLINICIAN_COLORS[name]}
                />
                <MetricCard
                  label="Profit Generated"
                  value={formatCurrency(s.profit)}
                  accentColor={CLINICIAN_COLORS[name]}
                />
                <MetricCard
                  label="Avg Margin / Period"
                  value={`${(s.avgMargin * 100).toFixed(1)}%`}
                  accentColor={CLINICIAN_COLORS[name]}
                />
                <MetricCard
                  label="Total Sessions"
                  value={s.sessions}
                  accentColor={CLINICIAN_COLORS[name]}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
