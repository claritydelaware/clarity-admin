import type { ApexOptions } from 'apexcharts'

import { CHART_PALETTE, COLORS } from '../../lib/chartTheme'

const CHART_COLORS = CHART_PALETTE

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
    borderColor: COLORS.border,
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
      style: { fontFamily: FONT, fontSize: '11px', colors: COLORS.muted },
    },
    axisBorder: { color: COLORS.border },
    axisTicks: { color: COLORS.border },
  },
  yaxis: {
    labels: {
      style: { fontFamily: FONT, fontSize: '11px', colors: COLORS.muted },
    },
  },
  legend: {
    fontFamily: FONT,
    fontSize: '12px',
    labels: { colors: COLORS.muted },
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
