import ReactApexChart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { mergeChartOptions } from './baseChartOptions'

type ApexSeries = ApexOptions['series']

interface LineChartProps {
  series: ApexSeries
  categories: string[]
  height?: number
  colors?: string[]
  chartType?: 'line' | 'bar'
  yFormatter?: (v: number) => string
  tooltipFormatter?: (v: number) => string
  options?: ApexOptions
}

export default function LineChart({
  series,
  categories,
  height = 220,
  colors,
  chartType = 'line',
  yFormatter,
  tooltipFormatter,
  options: overrides = {},
}: LineChartProps) {
  const options = mergeChartOptions({
    chart: { type: chartType },
    markers: { size: 3 },
    ...(colors && { colors }),
    xaxis: { categories },
    ...(yFormatter && { yaxis: { labels: { formatter: yFormatter } } }),
    ...(tooltipFormatter && { tooltip: { y: { formatter: tooltipFormatter } } }),
    ...overrides,
  })

  return <ReactApexChart options={options} series={series} type={chartType} height={height} />
}
