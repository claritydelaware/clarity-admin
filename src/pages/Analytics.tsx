import { useMemo, useState } from 'react'
import { Loader2, AlertCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import ReactApexChart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { useCaseloadTrends } from '../hooks/useAnalytics'
import { useQuarterlySummary } from '../hooks/useQuarterlySummary'
import { useQuarterProjection } from '../hooks/useQuarterProjection'
import { usePayerPerformance } from '../hooks/usePayerPerformance'
import { formatCurrency } from '../lib/utils'
import type { CaseloadTrendMonth, PayerPerformance } from '../types'

const COLORS = {
  revenue:   '#254D54',
  income:    '#3A7078',
  overhead:  '#9CA3AF',
  margin:    '#F6C54D',
  shannon:   '#254D54',
  jen:       '#F6C54D',
  emily:     '#3A7078',
  shana:     '#C9922A',
  highlight: '#DC2626',
}

const baseOptions: ApexOptions = {
  chart: {
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: 'DM Sans, sans-serif',
    background: 'transparent',
    animations: { enabled: true, speed: 400 },
  },
  grid: {
    borderColor: '#E8F1F2',
    strokeDashArray: 4,
  },
  xaxis: {
    labels: { style: { fontSize: '11px', fontFamily: 'DM Sans, sans-serif' } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: { style: { fontSize: '11px', fontFamily: 'DM Sans, sans-serif' } },
  },
  tooltip: {
    style: { fontSize: '12px', fontFamily: 'DM Sans, sans-serif' },
  },
  legend: {
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '12px',
    markers: { size: 6 },
    itemMargin: { horizontal: 12, vertical: 8 },
  },
}

function monthLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function pct(val: number | null): string {
  if (val === null) return '—'
  return `${val.toFixed(1)}%`
}

function utilColor(val: number | null): string {
  if (val === null) return 'text-muted'
  if (val >= 100) return 'text-error font-semibold'
  if (val >= 95)  return 'text-amber-600 font-semibold'
  return 'text-ink'
}

// ─── SECTION: Financial Performance ──────────────────────────────────────────

function FinancialSection({ months }: { months: CaseloadTrendMonth[] }) {
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

  const options: ApexOptions = {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'line' },
    stroke: { curve: 'smooth', width: [2, 2, 1.5, 2], dashArray: [0, 0, 4, 0] },
    fill: {
      type: ['gradient', 'gradient', 'solid', 'solid'],
      gradient: { shadeIntensity: 1, opacityFrom: 0.12, opacityTo: 0.01 },
    },
    colors: [COLORS.revenue, COLORS.income, COLORS.overhead, COLORS.margin],
    xaxis: { ...baseOptions.xaxis, categories: chartData.map(d => d.month) },
    yaxis: {
      ...baseOptions.yaxis,
      labels: { ...(baseOptions.yaxis as any)?.labels, formatter: (v: number) => `$${(v / 1000).toFixed(0)}k` },
    },
    dataLabels: { enabled: false },
    tooltip: { ...baseOptions.tooltip, shared: true, y: { formatter: (v: number) => formatCurrency(v) } },
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-base font-semibold text-ink">Financial Performance</h2>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <p className="font-heading text-sm font-semibold text-ink">Revenue, Income, Overhead &amp; Margin</p>
        </div>
        <div className="px-5 pb-5">
          <ReactApexChart options={options} series={series} type="line" height={260} />
        </div>
      </div>

      {latest && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <SmallMetric label="Revenue" value={formatCurrency(latest.totalRevenue ?? 0)} />
          <SmallMetric label="Income" value={formatCurrency(latest.income ?? 0)} />
          <SmallMetric
            label="Gross Margin"
            value={formatCurrency(latest.grossMargin ?? 0)}
            sub={pct(latest.grossMarginPct)}
          />
          <SmallMetric
            label="Collection Variance"
            value={formatCurrency(latest.collectionVariance ?? 0)}
            danger={(latest.collectionVariance ?? 0) > 500}
          />
        </div>
      )}
    </div>
  )
}

// ─── SECTION: Clinician Productivity ─────────────────────────────────────────

function ProductivitySection({ months }: { months: CaseloadTrendMonth[] }) {
  const last6 = months.slice(-6)
  const chartData = last6.map(m => ({
    month:   monthLabel(m.month),
    Shannon: m.shannonSessions,
    Jen:     m.jenSessions,
    Emily:   m.emilySessions,
    Shana:   m.shanaSessions,
  }))

  const latest = months[months.length - 1]

  const rows = [
    {
      name:     'Shannon',
      sessions: latest?.shannonSessions,
      clients:  latest?.shannonClients,
      avgPerWk: latest?.shannonAvgPerWeek,
      utilPct:  latest?.shannonUtilPct,
      revenue:  latest?.shannonRevenue,
    },
    {
      name:     'Jen',
      sessions: latest?.jenSessions,
      clients:  latest?.jenClients,
      avgPerWk: latest?.jenAvgPerWeek,
      utilPct:  latest?.jenUtilPct,
      revenue:  latest?.jenRevenue,
    },
    {
      name:     'Emily',
      sessions: latest?.emilySessions,
      clients:  latest?.emilyClients,
      avgPerWk: latest?.emilyAvgPerWeek,
      utilPct:  latest?.emilyUtilPct,
      revenue:  latest?.emilyRevenue,
    },
    {
      name:     'Shana',
      sessions: latest?.shanaSessions,
      clients:  latest?.shanaClients,
      avgPerWk: latest?.shanaAvgPerWeek,
      utilPct:  latest?.shanaUtilPct,
      revenue:  latest?.shanaRevenue,
    },
  ]

  const series = [
    { name: 'Shannon', data: chartData.map(d => d.Shannon ?? null) },
    { name: 'Jen',     data: chartData.map(d => d.Jen     ?? null) },
    { name: 'Emily',   data: chartData.map(d => d.Emily   ?? null) },
    { name: 'Shana',   data: chartData.map(d => d.Shana   ?? null) },
  ]

  const options: ApexOptions = {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'bar' },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '65%' } },
    colors: [COLORS.shannon, COLORS.jen, COLORS.emily, COLORS.shana],
    xaxis: { ...baseOptions.xaxis, categories: chartData.map(d => d.month) },
    dataLabels: { enabled: false },
    tooltip: { ...baseOptions.tooltip, shared: true, intersect: false },
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-base font-semibold text-ink">Clinician Productivity</h2>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <p className="font-heading text-sm font-semibold text-ink">Sessions by Clinician</p>
          <span className="text-xs text-muted font-body">Last 6 months</span>
        </div>
        <div className="px-5 pb-5">
          <ReactApexChart options={options} series={series} type="bar" height={220} />
        </div>
      </div>

      {latest && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">
              Most Recent Month — {monthLabel(latest.month)}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Clinician', 'Sessions', 'Clients', 'Avg/Wk', 'Util %', 'Revenue'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(r => (
                  <tr key={r.name} className="hover:bg-cream transition-colors">
                    <td className="px-4 py-2.5 font-medium text-ink">{r.name}</td>
                    <td className="px-4 py-2.5 tabular-nums">{r.sessions ?? '—'}</td>
                    <td className="px-4 py-2.5 tabular-nums">{r.clients ?? '—'}</td>
                    <td className="px-4 py-2.5 tabular-nums">{r.avgPerWk?.toFixed(1) ?? '—'}</td>
                    <td className={`px-4 py-2.5 tabular-nums ${utilColor(r.utilPct)}`}>{pct(r.utilPct)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{r.revenue !== null && r.revenue !== undefined ? formatCurrency(r.revenue) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SECTION: Revenue Per Session ────────────────────────────────────────────

function RevenuePerSessionSection({ months }: { months: CaseloadTrendMonth[] }) {
  const chartData = months
    .filter(m => m.revenuePerSession !== null)
    .map(m => ({ month: monthLabel(m.month), rps: m.revenuePerSession }))

  const series = [{ name: 'Revenue/Session', data: chartData.map(d => d.rps ?? null) }]

  const options: ApexOptions = {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'line' },
    stroke: { curve: 'smooth', width: 2 },
    markers: { size: 3 },
    colors: [COLORS.revenue],
    xaxis: { ...baseOptions.xaxis, categories: chartData.map(d => d.month) },
    yaxis: {
      ...baseOptions.yaxis,
      labels: { ...(baseOptions.yaxis as any)?.labels, formatter: (v: number) => `$${v}` },
    },
    dataLabels: { enabled: false },
    tooltip: { ...baseOptions.tooltip, y: { formatter: (v: number) => `$${v}` } },
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-base font-semibold text-ink">Revenue Per Session</h2>
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <p className="font-heading text-sm font-semibold text-ink">Revenue / Session</p>
        </div>
        <div className="px-5 pb-5">
          <ReactApexChart options={options} series={series} type="line" height={180} />
        </div>
      </div>
    </div>
  )
}

// ─── SECTION: Collection Efficiency ──────────────────────────────────────────

function CollectionSection({ months }: { months: CaseloadTrendMonth[] }) {
  const chartData = months
    .filter(m => m.collectionVariance !== null)
    .map(m => ({
      month:    monthLabel(m.month),
      variance: m.collectionVariance,
      fill:     Math.abs(m.collectionVariance ?? 0) > 2000 ? COLORS.highlight : COLORS.revenue,
    }))

  const colors = chartData.map(d => d.fill)
  const series = [{ name: 'Variance', data: chartData.map(d => d.variance ?? null) }]

  const options: ApexOptions = {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'bar' },
    plotOptions: { bar: { distributed: true, borderRadius: 3, columnWidth: '60%' } },
    colors,
    legend: { show: false },
    xaxis: { ...baseOptions.xaxis, categories: chartData.map(d => d.month) },
    yaxis: {
      ...baseOptions.yaxis,
      labels: { ...(baseOptions.yaxis as any)?.labels, formatter: (v: number) => `$${(v / 1000).toFixed(0)}k` },
    },
    dataLabels: { enabled: false },
    tooltip: { ...baseOptions.tooltip, y: { formatter: (v: number) => formatCurrency(v) } },
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-base font-semibold text-ink">Collection Efficiency</h2>
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <p className="font-heading text-sm font-semibold text-ink">Collection Variance by Month</p>
        </div>
        <div className="px-5 pb-5">
          <p className="text-xs text-muted font-body mb-3">
            Positive = under-collected vs billed; negative = over-collected. Red bars exceed ±$2,000.
          </p>
          <ReactApexChart options={options} series={series} type="bar" height={200} />
        </div>
      </div>
    </div>
  )
}

// ─── SMALL METRIC CARD ────────────────────────────────────────────────────────

function SmallMetric({ label, value, sub, danger }: {
  label: string; value: string; sub?: string; danger?: boolean
}) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${danger ? 'border-red-200' : 'border-gray-200'}`}>
      <p className={`text-xs font-body uppercase tracking-wide mb-1 ${danger ? 'text-error' : 'text-muted'}`}>{label}</p>
      <p className={`font-heading text-lg font-semibold ${danger ? 'text-error' : 'text-ink'}`}>{value}</p>
      {sub && <p className="text-xs text-muted font-body mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { data: rawMonths, isLoading, isError, error } = useCaseloadTrends()

  const months = useMemo(() => {
    if (!rawMonths) return []
    return rawMonths.filter(m => m.month)
  }, [rawMonths])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm font-body">Loading analytics…</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-error font-body">
        <AlertCircle size={16} className="shrink-0" />
        {(error as Error).message}
      </div>
    )
  }

  if (months.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-gray-200">
        <p className="text-sm font-body text-muted">No analytics data available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-xl font-semibold text-ink">Analytics</h1>
      <FinancialSection months={months} />
      <ProductivitySection months={months} />
      <RevenuePerSessionSection months={months} />
      <CollectionSection months={months} />
      <QuarterlySection />
      <QuarterProjectionSection />
      <PayerPerformanceSection />
    </div>
  )
}

// ─── SECTION: Quarterly Performance ──────────────────────────────────────────

function QuarterlySection() {
  const { data: quarters, isLoading } = useQuarterlySummary()

  const chartData = useMemo(() => {
    if (!quarters) return []
    return quarters.map(q => ({
      label: q.label,
      Revenue: q.revenue,
      Income: q.income,
      Profit: q.profit,
      marginPct: q.marginPct != null ? Math.round(q.marginPct * 100) : null,
    }))
  }, [quarters])

  const series = [
    { name: 'Revenue',  data: chartData.map(d => d.Revenue),   type: 'bar'  as const },
    { name: 'Income',   data: chartData.map(d => d.Income),    type: 'bar'  as const },
    { name: 'Profit',   data: chartData.map(d => d.Profit),    type: 'bar'  as const },
    { name: 'Margin %', data: chartData.map(d => d.marginPct), type: 'line' as const },
  ]

  const options: ApexOptions = {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'bar' },
    stroke: { width: [0, 0, 0, 2], curve: 'smooth' },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '65%' } },
    colors: ['#E8F1F2', '#3A7078', '#254D54', '#F6C54D'],
    fill: { opacity: [1, 1, 1, 1] },
    xaxis: { ...baseOptions.xaxis, categories: chartData.map(d => d.label) },
    yaxis: [
      {
        seriesName: 'Revenue',
        labels: {
          style: { fontSize: '11px', fontFamily: 'DM Sans, sans-serif' },
          formatter: (v: number) => `$${(v / 1000).toFixed(0)}k`,
        },
      },
      {
        seriesName: 'Income',
        show: false,
      },
      {
        seriesName: 'Profit',
        show: false,
      },
      {
        seriesName: 'Margin %',
        opposite: true,
        min: 0,
        max: 100,
        labels: {
          style: { fontSize: '11px', fontFamily: 'DM Sans, sans-serif' },
          formatter: (v: number) => `${v}%`,
        },
      },
    ],
    dataLabels: { enabled: false },
    tooltip: {
      ...baseOptions.tooltip,
      shared: true,
      intersect: false,
      y: {
        formatter: (v: number, opts?: { seriesIndex?: number }) => {
          if (v == null) return '—'
          if (opts?.seriesIndex === 3) return `${v}%`
          return formatCurrency(v)
        },
      },
    },
  }

  return (
    <div>
      <h2 className="font-heading text-base font-semibold text-ink mb-4">Quarterly Performance</h2>

      {isLoading && (
        <div className="flex items-center justify-center bg-white rounded-xl border border-gray-200 py-10">
          <Loader2 size={18} className="animate-spin text-muted mr-2" />
          <span className="text-sm font-body text-muted">Loading…</span>
        </div>
      )}

      {quarters && quarters.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 py-10 text-center">
          <p className="text-sm font-body text-muted">No quarterly data yet.</p>
        </div>
      )}

      {quarters && quarters.length > 0 && (
        <div className="space-y-4">
          {/* Missing overhead warnings */}
          {quarters.flatMap(q => q.missingOverheadMonths.map(m => (
            <div key={`${q.label}-${m}`} className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm font-body text-amber-800">
              <AlertTriangle size={15} className="shrink-0" />
              Overhead data missing for {m} — import from Xero to complete {q.label}
            </div>
          )))}

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <p className="font-heading text-sm font-semibold text-ink">Revenue, Income &amp; Profit</p>
            </div>
            <div className="px-5 pb-5">
              <ReactApexChart options={options} series={series} type="bar" height={260} />
            </div>
          </div>

          {/* Quarterly summary table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm font-body">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Quarter</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Income</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Overhead</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Profit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Margin</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...quarters].reverse().map(q => (
                  <tr key={q.label} className="hover:bg-cream transition-colors">
                    <td className="px-5 py-3 font-medium text-ink">{q.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(q.revenue)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(q.income)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{formatCurrency(q.totalOverhead)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${q.profit >= 0 ? 'text-success' : 'text-error'}`}>
                      {formatCurrency(q.profit)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {q.marginPct != null ? `${Math.round(q.marginPct * 100)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{q.sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SECTION: Quarter Projection ─────────────────────────────────────────────

function pctChange(current: number, prior: number): string {
  if (prior === 0) return '—'
  const p = ((current - prior) / Math.abs(prior)) * 100
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`
}

function pctChangeColor(current: number, prior: number, positiveIsGood: boolean): string {
  if (prior === 0) return 'text-muted'
  const up = current >= prior
  const favorable = positiveIsGood ? up : !up
  return favorable ? 'text-success font-medium' : 'text-error font-medium'
}

function QuarterProjectionSection() {
  const { data: proj, isLoading } = useQuarterProjection()

  if (isLoading) {
    return (
      <div>
        <h2 className="font-heading text-base font-semibold text-ink mb-4">Quarter Projection</h2>
        <div className="flex items-center justify-center bg-white rounded-xl border border-gray-200 py-10">
          <Loader2 size={18} className="animate-spin text-muted mr-2" />
          <span className="text-sm font-body text-muted">Loading…</span>
        </div>
      </div>
    )
  }

  if (!proj) return null

  const progressPct = Math.round((proj.elapsedDays / proj.totalQuarterDays) * 100)

  return (
    <div>
      <h2 className="font-heading text-base font-semibold text-ink mb-4">Quarter Projection</h2>

      {/* Missing overhead warnings */}
      {proj.missingOverheadMonths.map(m => (
        <div key={m} className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm font-body text-amber-800 mb-3">
          <AlertTriangle size={15} className="shrink-0" />
          Overhead data missing for {m} — projection accounts for this using available month averages
        </div>
      ))}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left panel — full quarter projection table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="font-heading text-sm font-semibold text-ink">{proj.quarterLabel} Full Quarter Projection</p>
            <span className="text-xs font-body text-muted">{progressPct}% through quarter</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted uppercase tracking-wide"></th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted uppercase tracking-wide">Revenue</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted uppercase tracking-wide">Income</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted uppercase tracking-wide">Overhead</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted uppercase tracking-wide">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr className="hover:bg-cream transition-colors">
                  <td className="px-4 py-2.5 text-muted">Actuals to date</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(proj.actualRevenue)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(proj.actualIncome)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{formatCurrency(proj.actualOverhead)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${proj.actualProfit >= 0 ? 'text-success' : 'text-error'}`}>
                    {formatCurrency(proj.actualProfit)}
                  </td>
                </tr>
                <tr className="hover:bg-cream transition-colors">
                  <td className="px-4 py-2.5 text-muted">Projected remaining</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{formatCurrency(proj.projectedRemainingRevenue)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{formatCurrency(proj.projectedRemainingIncome)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{formatCurrency(proj.projectedRemainingOverhead)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                    {formatCurrency(proj.projectedRemainingProfit)}
                  </td>
                </tr>
                <tr className="bg-teal-pale/30 font-semibold">
                  <td className="px-4 py-3 text-ink">Total projection</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink">{formatCurrency(proj.projectedTotalRevenue)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink">{formatCurrency(proj.projectedTotalIncome)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{formatCurrency(proj.projectedTotalOverhead)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${proj.projectedTotalProfit >= 0 ? 'text-success' : 'text-error'}`}>
                    {formatCurrency(proj.projectedTotalProfit)}
                    {proj.projectedMarginPct != null && (
                      <span className="text-xs font-body font-normal text-muted ml-1">
                        ({Math.round(proj.projectedMarginPct * 100)}% margin)
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right panel — QTD vs prior QTD */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="font-heading text-sm font-semibold text-ink">QTD Comparison</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted uppercase tracking-wide">Metric</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted uppercase tracking-wide">{proj.qtdLabel}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted uppercase tracking-wide">{proj.priorQtdLabel}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted uppercase tracking-wide">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {([
                  { label: 'Revenue',  cur: proj.actualRevenue,  prior: proj.priorRevenue,  good: true  },
                  { label: 'Income',   cur: proj.actualIncome,   prior: proj.priorIncome,   good: true  },
                  { label: 'Overhead', cur: proj.actualOverhead, prior: proj.priorOverhead, good: false },
                  { label: 'Profit',   cur: proj.actualProfit,   prior: proj.priorProfit,   good: true  },
                ] as const).map(({ label, cur, prior, good }) => (
                  <tr key={label} className="hover:bg-cream transition-colors">
                    <td className="px-4 py-2.5 font-medium text-ink">{label}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(cur)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted">{formatCurrency(prior)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${pctChangeColor(cur, prior, good)}`}>
                      {pctChange(cur, prior)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SECTION: Payer Performance ───────────────────────────────────────────────

type SortKey = keyof PayerPerformance
function useSort(initial: SortKey) {
  const [key, setKey] = useState<SortKey>(initial)
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  const toggle = (k: SortKey) => {
    if (k === key) setDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setKey(k); setDir('desc') }
  }
  return { key, dir, toggle }
}

function PayerPerformanceSection() {
  const { data: payers, isLoading } = usePayerPerformance()
  const { key, dir, toggle } = useSort('totalClaims')

  const sorted = useMemo(() => {
    if (!payers) return []
    return [...payers].sort((a, b) => {
      const av = a[key] ?? -Infinity
      const bv = b[key] ?? -Infinity
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return dir === 'asc' ? cmp : -cmp
    })
  }, [payers, key, dir])

  const SortIndicator = ({ col }: { col: SortKey }) =>
    key === col ? (dir === 'asc' ? <ChevronUp size={12} className="inline" /> : <ChevronDown size={12} className="inline" />) : null

  return (
    <div>
      <h2 className="font-heading text-base font-semibold text-ink mb-4">Payer Performance</h2>

      {isLoading && (
        <div className="flex items-center justify-center bg-white rounded-xl border border-gray-200 py-10">
          <Loader2 size={18} className="animate-spin text-muted mr-2" />
          <span className="text-sm font-body text-muted">Loading…</span>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {([
                    ['payer',             'Payer'],
                    ['totalClaims',       'Total Claims'],
                    ['avgDaysToPay',      'Avg Days to Pay'],
                    ['collectionRate',    'Collection Rate'],
                    ['pendingCount',      'Pending'],
                    ['oldestPendingDays', 'Oldest Pending'],
                  ] as [SortKey, string][]).map(([col, label]) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-xs font-medium text-muted uppercase tracking-wide cursor-pointer select-none hover:text-ink text-right first:text-left"
                      onClick={() => toggle(col)}
                    >
                      {label} <SortIndicator col={col} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map(p => (
                  <tr key={p.payer} className="hover:bg-cream transition-colors">
                    <td className="px-4 py-3 font-medium text-ink">{p.payer}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{p.totalClaims}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {p.avgDaysToPay != null ? `${p.avgDaysToPay}d` : '—'}
                    </td>
                    <td className={[
                      'px-4 py-3 text-right tabular-nums font-medium',
                      p.collectionRate != null && p.collectionRate < 0.80 ? 'text-amber-600' : 'text-ink',
                    ].join(' ')}>
                      {p.collectionRate != null ? `${Math.round(p.collectionRate * 100)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{p.pendingCount}</td>
                    <td className={[
                      'px-4 py-3 text-right tabular-nums',
                      p.oldestPendingDays != null && p.oldestPendingDays >= 90 ? 'text-error font-medium' : 'text-muted',
                    ].join(' ')}>
                      {p.oldestPendingDays != null ? `${p.oldestPendingDays}d` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
