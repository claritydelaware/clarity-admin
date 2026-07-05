import { useMemo } from 'react'
import ReactApexChart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { AlertTriangle, FileDown } from 'lucide-react'
import { mergeChartOptions } from '../charts/baseChartOptions'
import ChartCard from '../charts/ChartCard'
import Card from '../ui/Card'
import Button from '../ui/Button'
import LoadingSpinner from '../ui/LoadingSpinner'
import { useQuarterlySummary } from '../../hooks/useQuarterlySummary'
import { useQuarterProjection } from '../../hooks/useQuarterProjection'
import { usePayerPerformance } from '../../hooks/usePayerPerformance'
import { formatCurrency } from '../../lib/utils'

function pctChange(current: number, prior: number): string {
  if (prior === 0) return '—'
  const p = ((current - prior) / Math.abs(prior)) * 100
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`
}

function pctChangeColor(current: number, prior: number, positiveIsGood: boolean): string {
  if (prior === 0) return 'text-muted'
  const favorable = positiveIsGood ? current >= prior : current < prior
  return favorable ? 'text-success font-medium' : 'text-error font-medium'
}

function QuarterlyPerformance() {
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

  const options: ApexOptions = mergeChartOptions({
    chart: { type: 'bar' },
    stroke: { width: [0, 0, 0, 2], curve: 'smooth' },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '65%' } },
    colors: ['#E8F1F2', '#3A7078', '#254D54', '#F6C54D'],
    fill: { opacity: [1, 1, 1, 1] },
    xaxis: { categories: chartData.map(d => d.label) },
    yaxis: [
      { seriesName: 'Revenue', labels: { style: { fontSize: '11px' }, formatter: (v: number) => `$${(v / 1000).toFixed(0)}k` } },
      { seriesName: 'Income', show: false },
      { seriesName: 'Profit', show: false },
      { seriesName: 'Margin %', opposite: true, min: 0, max: 100, labels: { style: { fontSize: '11px' }, formatter: (v: number) => `${v}%` } },
    ],
    tooltip: {
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
  })

  if (isLoading) return <LoadingSpinner label="Loading…" />
  if (!quarters || quarters.length === 0) {
    return (
      <Card padding="md">
        <p className="text-sm font-body text-muted text-center py-4">No quarterly data yet.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {quarters.flatMap(q => q.missingOverheadMonths.map(m => (
        <div key={`${q.label}-${m}`} className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm font-body text-amber-800">
          <AlertTriangle size={15} className="shrink-0" />
          Overhead data missing for {m} — import from Xero to complete {q.label}
        </div>
      )))}

      <ChartCard title="Revenue, Income & Profit">
        <ReactApexChart options={options} series={series} type="bar" height={260} />
      </ChartCard>

      <Card padding="none">
        <div className="overflow-x-auto">
        <table className="w-full text-sm font-body min-w-[600px]">
          <thead className="bg-surface-sunken border-b border-border">
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
              <tr key={q.label} className="hover:bg-surface-sunken transition-colors">
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
      </Card>
    </div>
  )
}

function QuarterProjection() {
  const { data: proj, isLoading } = useQuarterProjection()

  if (isLoading) return <LoadingSpinner label="Loading…" />
  if (!proj) return null

  const progressPct = Math.round((proj.elapsedDays / proj.totalQuarterDays) * 100)

  return (
    <div className="space-y-4">
      {proj.missingOverheadMonths.map(m => (
        <div key={m} className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm font-body text-amber-800">
          <AlertTriangle size={15} className="shrink-0" />
          Overhead data missing for {m} — projection accounts for this using available month averages
        </div>
      ))}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card padding="none">
          <div className="px-5 py-3 border-b border-border bg-surface-sunken flex items-center justify-between">
            <p className="font-heading text-sm font-semibold text-ink">{proj.quarterLabel} Full Quarter Projection</p>
            <span className="text-xs font-body text-muted">{progressPct}% through quarter</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted uppercase tracking-wide"></th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted uppercase tracking-wide">Revenue</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted uppercase tracking-wide">Income</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted uppercase tracking-wide">Overhead</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted uppercase tracking-wide">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr className="hover:bg-surface-sunken transition-colors">
                  <td className="px-4 py-2.5 text-muted">Actuals to date</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(proj.actualRevenue)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(proj.actualIncome)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{formatCurrency(proj.actualOverhead)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${proj.actualProfit >= 0 ? 'text-success' : 'text-error'}`}>
                    {formatCurrency(proj.actualProfit)}
                  </td>
                </tr>
                <tr className="hover:bg-surface-sunken transition-colors">
                  <td className="px-4 py-2.5 text-muted">Projected remaining</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{formatCurrency(proj.projectedRemainingRevenue)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{formatCurrency(proj.projectedRemainingIncome)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{formatCurrency(proj.projectedRemainingOverhead)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{formatCurrency(proj.projectedRemainingProfit)}</td>
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
        </Card>

        <Card padding="none">
          <div className="px-5 py-3 border-b border-border bg-surface-sunken">
            <p className="font-heading text-sm font-semibold text-ink">QTD Comparison</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-border">
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
                  <tr key={label} className="hover:bg-surface-sunken transition-colors">
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
        </Card>
      </div>
    </div>
  )
}

export default function QuarterProjectionCard() {
  const { data: quarters } = useQuarterlySummary()
  const { data: proj } = useQuarterProjection()
  const { data: payerPerformance } = usePayerPerformance()

  const canExport = !!proj

  // jsPDF pulls in html2canvas/dompurify (~600KB) that this export never uses —
  // dynamic import keeps that weight out of the main bundle until actually needed.
  const handleExport = async () => {
    if (!proj) return
    const { generateQuarterlyPDF } = await import('../../lib/generateQuarterlyPDF')
    const matchingQuarter = quarters?.find(q => q.label === proj.quarterLabel)
    generateQuarterlyPDF({
      quarterLabel: proj.quarterLabel,
      revenue: matchingQuarter?.revenue ?? proj.actualRevenue,
      income: matchingQuarter?.income ?? proj.actualIncome,
      totalOverhead: matchingQuarter?.totalOverhead ?? proj.actualOverhead,
      profit: matchingQuarter?.profit ?? proj.actualProfit,
      marginPct: matchingQuarter?.marginPct ?? null,
      sessions: matchingQuarter?.sessions ?? null,
      byClinicianRevenue: matchingQuarter?.byClinicianRevenue ?? null,
      projection: proj,
      payerPerformance: payerPerformance ?? [],
    })
  }

  return (
    <>
      <div>
        <h2 className="font-heading text-base font-semibold text-ink mb-4">Quarterly Performance</h2>
        <QuarterlyPerformance />
      </div>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-base font-semibold text-ink">Quarter Projection</h2>
          <Button variant="secondary" size="sm" icon={<FileDown size={14} />} disabled={!canExport} onClick={handleExport}>
            Export PDF
          </Button>
        </div>
        <QuarterProjection />
      </div>
    </>
  )
}
