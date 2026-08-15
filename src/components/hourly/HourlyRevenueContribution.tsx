import ChartCard from '../charts/ChartCard'
import BarChart from '../charts/BarChart'
import { CLINICIAN_COLORS } from '../../lib/utils'
import type { CaseloadTrendMonth } from '../../types'

function monthLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function HourlyRevenueContribution({ months }: { months: CaseloadTrendMonth[] }) {
  const last6 = months.filter(m => m.month).slice(-6)
  if (last6.length === 0) return null

  const pct = (part: number | null, total: number | null) =>
    part != null && total ? Math.round((part / total) * 1000) / 10 : null

  const categories = last6.map(m => monthLabel(m.month))
  const emilyPct = last6.map(m => pct(m.emilyRevenue, m.totalRevenue))
  const shanaPct = last6.map(m => pct(m.shanaRevenue, m.totalRevenue))

  const latest = last6[last6.length - 1]
  const latestHourlyPct = pct((latest.emilyRevenue ?? 0) + (latest.shanaRevenue ?? 0), latest.totalRevenue)

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-base font-semibold text-ink">Revenue Contribution to the Practice</h2>
      <ChartCard
        title="Emily & Shana Revenue, % of Total Practice Revenue"
        subtitle={latestHourlyPct != null ? `Most recent month: ${latestHourlyPct}% of practice revenue combined` : undefined}
      >
        <BarChart
          series={[
            { name: 'Emily', data: emilyPct },
            { name: 'Shana', data: shanaPct },
          ]}
          categories={categories}
          colors={[CLINICIAN_COLORS.Emily, CLINICIAN_COLORS.Shana]}
          yFormatter={(v: number) => `${v}%`}
          tooltipFormatter={(v: number) => `${v}%`}
          options={{ plotOptions: { bar: { borderRadius: 3, columnWidth: '55%' } } }}
        />
      </ChartCard>
    </div>
  )
}
