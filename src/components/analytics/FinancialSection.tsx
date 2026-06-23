import ReactApexChart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { mergeChartOptions } from '../charts/baseChartOptions'
import ChartCard from '../charts/ChartCard'
import MetricCard from '../ui/MetricCard'
import { formatCurrency } from '../../lib/utils'
import type { CaseloadTrendMonth } from '../../types'

const COLORS = {
  revenue:  '#254D54',
  income:   '#3A7078',
  overhead: '#9CA3AF',
  margin:   '#F6C54D',
}

function monthLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function pct(val: number | null | undefined): string {
  if (val == null) return '—'
  return `${val.toFixed(1)}%`
}

export default function FinancialSection({ months }: { months: CaseloadTrendMonth[] }) {
  const chartData = months.map(m => ({
    month: monthLabel(m.month),
    revenue:  m.totalRevenue,
    income:   m.income,
    overhead: m.totalOverhead,
    margin:   m.grossMargin,
  }))

  const latest = months[months.length - 1]

  const series = [
    { name: 'Revenue',      data: chartData.map(d => d.revenue  ?? null), type: 'area' as const },
    { name: 'Income',       data: chartData.map(d => d.income   ?? null), type: 'area' as const },
    { name: 'Overhead',     data: chartData.map(d => d.overhead ?? null), type: 'line' as const },
    { name: 'Gross Margin', data: chartData.map(d => d.margin   ?? null), type: 'line' as const },
  ]

  const options: ApexOptions = mergeChartOptions({
    chart: { type: 'line' },
    stroke: { curve: 'smooth', width: [2, 2, 1.5, 2], dashArray: [0, 0, 4, 0] },
    fill: {
      type: ['gradient', 'gradient', 'solid', 'solid'],
      gradient: { shadeIntensity: 1, opacityFrom: 0.12, opacityTo: 0.01 },
    },
    colors: [COLORS.revenue, COLORS.income, COLORS.overhead, COLORS.margin],
    xaxis: { categories: chartData.map(d => d.month) },
    yaxis: {
      labels: {
        style: { fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif" },
        formatter: (v: number) => `$${(v / 1000).toFixed(0)}k`,
      },
    },
    tooltip: { shared: true, y: { formatter: (v: number) => formatCurrency(v) } },
  })

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-base font-semibold text-ink">Financial Performance</h2>

      <ChartCard title="Revenue, Income, Overhead & Margin">
        <ReactApexChart options={options} series={series} type="line" height={260} />
      </ChartCard>

      {latest && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <MetricCard label="Revenue" value={formatCurrency(latest.totalRevenue ?? 0)} />
          <MetricCard label="Income" value={formatCurrency(latest.income ?? 0)} />
          <MetricCard
            label="Gross Margin"
            value={formatCurrency(latest.grossMargin ?? 0)}
            sub={pct(latest.grossMarginPct)}
          />
          <MetricCard
            label="Collection Variance"
            value={formatCurrency(latest.collectionVariance ?? 0)}
            className={(latest.collectionVariance ?? 0) > 500 ? 'border-red-200' : ''}
          />
        </div>
      )}
    </div>
  )
}
