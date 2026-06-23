import type { ApexOptions } from 'apexcharts'

const CHART_COLORS = [
  '#254D54', // teal
  '#F6C54D', // gold
  '#3A7078', // teal-mid
  '#C9922A', // gold-dark
  '#00C875', // status-green
  '#0086C9', // status-blue
]

const FONT = "'Plus Jakarta Sans', sans-serif"

export const baseChartOptions: ApexOptions = {
  chart: {
    fontFamily: FONT,
    toolbar: { show: false },
    zoom: { enabled: false },
    background: 'transparent',
    animations: {
      enabled: true,
      speed: 400,
    },
  },
  colors: CHART_COLORS,
  grid: {
    borderColor: '#E6E9EF',
    strokeDashArray: 4,
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
    padding: { left: 8, right: 8 },
  },
  stroke: {
    curve: 'smooth',
    width: 2,
  },
  tooltip: {
    theme: 'light',
    style: { fontFamily: FONT, fontSize: '12px' },
    y: { formatter: (val: number) => val?.toLocaleString() ?? '' },
  },
  xaxis: {
    labels: {
      style: { fontFamily: FONT, fontSize: '11px', colors: '#6B7280' },
    },
    axisBorder: { color: '#E6E9EF' },
    axisTicks: { color: '#E6E9EF' },
  },
  yaxis: {
    labels: {
      style: { fontFamily: FONT, fontSize: '11px', colors: '#6B7280' },
    },
  },
  legend: {
    fontFamily: FONT,
    fontSize: '12px',
    labels: { colors: '#6B7280' },
    markers: { size: 4, shape: 'circle' as const },
    itemMargin: { horizontal: 12 },
  },
  dataLabels: { enabled: false },
}

export function mergeChartOptions(overrides: ApexOptions): ApexOptions {
  return {
    ...baseChartOptions,
    ...overrides,
    chart: { ...baseChartOptions.chart, ...overrides.chart },
    grid: { ...baseChartOptions.grid, ...overrides.grid },
    tooltip: { ...baseChartOptions.tooltip, ...overrides.tooltip },
    xaxis: { ...baseChartOptions.xaxis, ...overrides.xaxis },
    yaxis: overrides.yaxis ?? baseChartOptions.yaxis,
    legend: { ...baseChartOptions.legend, ...overrides.legend },
  }
}
