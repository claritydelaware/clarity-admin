import ChartCard from '../charts/ChartCard'
import LineChart from '../charts/LineChart'
import BarChart from '../charts/BarChart'
import { formatCurrency } from '../../lib/utils'
import type { CaseloadTrendMonth } from '../../types'

function monthLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function RevenuePerSessionChart({ months }: { months: CaseloadTrendMonth[] }) {
  const chartData = months
    .filter(m => m.revenuePerSession !== null)
    .map(m => ({ month: monthLabel(m.month), rps: m.revenuePerSession }))

  return (
    <ChartCard title="Revenue / Session">
      <LineChart
        series={[{ name: 'Revenue/Session', data: chartData.map(d => d.rps ?? null) }]}
        categories={chartData.map(d => d.month)}
        colors={['#254D54']}
        yFormatter={(v: number) => `$${v}`}
        tooltipFormatter={(v: number) => `$${v}`}
      />
    </ChartCard>
  )
}

function CollectionVarianceChart({ months }: { months: CaseloadTrendMonth[] }) {
  const chartData = months
    .filter(m => m.collectionVariance !== null)
    .map(m => ({
      month:    monthLabel(m.month),
      variance: m.collectionVariance,
      fill:     Math.abs(m.collectionVariance ?? 0) > 2000 ? '#DC2626' : '#254D54',
    }))

  return (
    <ChartCard title="Collection Variance">
      <p className="text-xs text-muted font-body mb-3">
        Positive = under-collected vs billed; negative = over-collected. Red bars exceed ±$2,000.
      </p>
      <BarChart
        series={[{ name: 'Variance', data: chartData.map(d => d.variance ?? null) }]}
        categories={chartData.map(d => d.month)}
        colors={chartData.map(d => d.fill)}
        distributed
        yFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
        tooltipFormatter={(v: number) => formatCurrency(v)}
      />
    </ChartCard>
  )
}

export default function CollectionSection({ months }: { months: CaseloadTrendMonth[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <RevenuePerSessionChart months={months} />
      <CollectionVarianceChart months={months} />
    </div>
  )
}
