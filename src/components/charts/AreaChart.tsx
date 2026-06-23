import ReactApexChart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { mergeChartOptions } from './baseChartOptions'

type ApexSeries = ApexOptions['series']

interface AreaChartProps {
  series: ApexSeries
  categories: string[]
  height?: number
  colors?: string[]
  yFormatter?: (v: number) => string
  tooltipFormatter?: (v: number) => string
  options?: ApexOptions
}

export default function AreaChart({
  series,
  categories,
  height = 220,
  colors,
  yFormatter,
  tooltipFormatter,
  options: overrides = {},
}: AreaChartProps) {
  const options = mergeChartOptions({
    chart: { type: 'area' },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.15, opacityTo: 0.02, stops: [0, 100] },
    },
    ...(colors && { colors }),
    xaxis: { categories },
    ...(yFormatter && { yaxis: { labels: { formatter: yFormatter } } }),
    ...(tooltipFormatter && { tooltip: { y: { formatter: tooltipFormatter } } }),
    ...overrides,
  })

  return <ReactApexChart options={options} series={series} type="area" height={height} />
}
