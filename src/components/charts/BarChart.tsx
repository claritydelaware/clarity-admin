import ReactApexChart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { mergeChartOptions } from './baseChartOptions'

type ApexSeries = ApexOptions['series']

interface BarChartProps {
  series: ApexSeries
  categories: string[]
  height?: number
  colors?: string[]
  distributed?: boolean
  yFormatter?: (v: number) => string
  tooltipFormatter?: (v: number) => string
  options?: ApexOptions
}

export default function BarChart({
  series,
  categories,
  height = 220,
  colors,
  distributed = false,
  yFormatter,
  tooltipFormatter,
  options: overrides = {},
}: BarChartProps) {
  const options = mergeChartOptions({
    chart: { type: 'bar' },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '60%', distributed } },
    ...(colors && { colors }),
    ...(distributed && { legend: { show: false } }),
    xaxis: { categories },
    ...(yFormatter && { yaxis: { labels: { formatter: yFormatter } } }),
    ...(tooltipFormatter && { tooltip: { y: { formatter: tooltipFormatter } } }),
    ...overrides,
  })

  return <ReactApexChart options={options} series={series} type="bar" height={height} />
}
