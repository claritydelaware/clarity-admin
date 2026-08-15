import ReactApexChart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { mergeChartOptions } from '../charts/baseChartOptions'
import ChartCard from '../charts/ChartCard'
import { CLINICIAN_COLORS } from '../../lib/utils'
import type { HourlyPerformanceHistory, HourlyPeriodHistoryEntry } from '../../types'

function toPoints(entries: HourlyPeriodHistoryEntry[]) {
  return entries.map(e => ({ x: new Date(e.periodEnd).getTime(), y: Math.round(e.profitMargin * 1000) / 10 }))
}

export default function HourlyMarginTrendChart({ history }: { history: HourlyPerformanceHistory }) {
  const series = [
    { name: 'Emily', data: toPoints(history.Emily) },
    { name: 'Shana', data: toPoints(history.Shana) },
  ].filter(s => s.data.length > 0)

  if (series.length === 0) return null

  const options: ApexOptions = mergeChartOptions({
    chart: { type: 'line' },
    stroke: { curve: 'smooth', width: 2.5 },
    colors: [CLINICIAN_COLORS.Emily, CLINICIAN_COLORS.Shana],
    xaxis: { type: 'datetime', labels: { datetimeUTC: false, format: 'MMM d' } },
    yaxis: {
      labels: {
        style: { fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif" },
        formatter: (v: number) => `${v.toFixed(0)}%`,
      },
    },
    tooltip: { shared: true, x: { format: 'MMM d, yyyy' }, y: { formatter: (v: number) => `${v.toFixed(1)}%` } },
    markers: { size: 3 },
  })

  return (
    <ChartCard title="Profit Margin by Pay Period" subtitle="Profit ÷ payments received, per closed pay period">
      <ReactApexChart options={options} series={series} type="line" height={260} />
    </ChartCard>
  )
}
