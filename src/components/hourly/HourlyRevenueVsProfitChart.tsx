import ReactApexChart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { mergeChartOptions } from '../charts/baseChartOptions'
import ChartCard from '../charts/ChartCard'
import { formatCurrency, CLINICIAN_COLORS } from '../../lib/utils'
import type { HourlyPeriodHistoryEntry, HourlyPerformanceHistory } from '../../types'

function ClinicianChart({ name, entries }: { name: 'Emily' | 'Shana'; entries: HourlyPeriodHistoryEntry[] }) {
  if (entries.length === 0) return null

  const revenue = entries.map(e => ({ x: new Date(e.periodEnd).getTime(), y: Math.round(e.revenue * 100) / 100 }))
  const profit  = entries.map(e => ({ x: new Date(e.periodEnd).getTime(), y: Math.round(e.profit * 100) / 100 }))

  const series = [
    { name: 'Revenue', data: revenue, type: 'area' as const },
    { name: 'Profit',  data: profit,  type: 'line' as const },
  ]

  const options: ApexOptions = mergeChartOptions({
    chart: { type: 'line' },
    stroke: { curve: 'smooth', width: [2, 2.5] },
    fill: { type: ['gradient', 'solid'], gradient: { shadeIntensity: 1, opacityFrom: 0.15, opacityTo: 0.02 } },
    colors: [CLINICIAN_COLORS[name], '#16A34A'],
    xaxis: { type: 'datetime', labels: { datetimeUTC: false, format: 'MMM d' } },
    yaxis: {
      labels: {
        style: { fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif" },
        formatter: (v: number) => `$${(v / 1000).toFixed(1)}k`,
      },
    },
    tooltip: { shared: true, x: { format: 'MMM d, yyyy' }, y: { formatter: (v: number) => formatCurrency(v) } },
  })

  return (
    <ChartCard title={`${name} — Revenue vs. Profit`}>
      <ReactApexChart options={options} series={series} type="line" height={220} />
    </ChartCard>
  )
}

export default function HourlyRevenueVsProfitChart({ history }: { history: HourlyPerformanceHistory }) {
  return (
    <div className="space-y-4">
      <h2 className="font-heading text-base font-semibold text-ink">Revenue vs. Profit per Period</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <ClinicianChart name="Emily" entries={history.Emily} />
        <ClinicianChart name="Shana" entries={history.Shana} />
      </div>
    </div>
  )
}
