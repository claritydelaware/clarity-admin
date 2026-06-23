import ChartCard from '../charts/ChartCard'
import BarChart from '../charts/BarChart'
import Card from '../ui/Card'
import { CLINICIAN_COLORS } from '../../lib/utils'
import type { CaseloadTrendMonth } from '../../types'

function monthLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function pct(val: number | null | undefined): string {
  if (val == null) return '—'
  return `${val.toFixed(1)}%`
}

function utilColor(val: number | null | undefined): string {
  if (val == null) return 'text-muted'
  if (val >= 100) return 'text-error font-semibold'
  if (val >= 95)  return 'text-amber-600 font-semibold'
  return 'text-ink'
}

function formatRevenue(val: number | null | undefined): string {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

export default function ProductivitySection({ months }: { months: CaseloadTrendMonth[] }) {
  const last6 = months.slice(-6)
  const chartData = last6.map(m => ({
    month:   monthLabel(m.month),
    Shannon: m.shannonSessions,
    Jen:     m.jenSessions,
    Emily:   m.emilySessions,
    Shana:   m.shanaSessions,
  }))

  const latest = months[months.length - 1]

  const rows = [
    { name: 'Shannon', sessions: latest?.shannonSessions, clients: latest?.shannonClients, avgPerWk: latest?.shannonAvgPerWeek, utilPct: latest?.shannonUtilPct, revenue: latest?.shannonRevenue },
    { name: 'Jen',     sessions: latest?.jenSessions,     clients: latest?.jenClients,     avgPerWk: latest?.jenAvgPerWeek,     utilPct: latest?.jenUtilPct,     revenue: latest?.jenRevenue },
    { name: 'Emily',   sessions: latest?.emilySessions,   clients: latest?.emilyClients,   avgPerWk: latest?.emilyAvgPerWeek,   utilPct: latest?.emilyUtilPct,   revenue: latest?.emilyRevenue },
    { name: 'Shana',   sessions: latest?.shanaSessions,   clients: latest?.shanaClients,   avgPerWk: latest?.shanaAvgPerWeek,   utilPct: latest?.shanaUtilPct,   revenue: latest?.shanaRevenue },
  ]

  const series = [
    { name: 'Shannon', data: chartData.map(d => d.Shannon ?? null) },
    { name: 'Jen',     data: chartData.map(d => d.Jen     ?? null) },
    { name: 'Emily',   data: chartData.map(d => d.Emily   ?? null) },
    { name: 'Shana',   data: chartData.map(d => d.Shana   ?? null) },
  ]

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-base font-semibold text-ink">Clinician Productivity</h2>

      <ChartCard title="Sessions by Clinician" subtitle="Last 6 months">
        <BarChart
          series={series}
          categories={chartData.map(d => d.month)}
          colors={[CLINICIAN_COLORS.Shannon, CLINICIAN_COLORS.Jen, CLINICIAN_COLORS.Emily, CLINICIAN_COLORS.Shana]}
          options={{
            plotOptions: { bar: { borderRadius: 3, columnWidth: '65%' } },
            tooltip: { shared: true, intersect: false },
          }}
        />
      </ChartCard>

      {latest && (
        <Card padding="none">
          <div className="px-5 py-3 border-b border-border bg-surface-sunken">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">
              Most Recent Month — {monthLabel(latest.month)}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-border">
                  {['Clinician', 'Sessions', 'Clients', 'Avg/Wk', 'Util %', 'Revenue'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(r => (
                  <tr key={r.name} className="hover:bg-surface-sunken transition-colors">
                    <td className="px-4 py-2.5 font-medium text-ink">{r.name}</td>
                    <td className="px-4 py-2.5 tabular-nums">{r.sessions ?? '—'}</td>
                    <td className="px-4 py-2.5 tabular-nums">{r.clients ?? '—'}</td>
                    <td className="px-4 py-2.5 tabular-nums">{r.avgPerWk?.toFixed(1) ?? '—'}</td>
                    <td className={`px-4 py-2.5 tabular-nums ${utilColor(r.utilPct)}`}>{pct(r.utilPct)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{formatRevenue(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
