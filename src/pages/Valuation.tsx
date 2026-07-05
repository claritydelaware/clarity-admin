import { useMemo } from 'react'
import ReactApexChart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import { useValuationSnapshot } from '../hooks/useValuationSnapshot'
import PageHeader from '../components/layout/PageHeader'
import MetricCard from '../components/ui/MetricCard'
import ChartCard from '../components/charts/ChartCard'
import Card from '../components/ui/Card'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorBanner from '../components/ui/ErrorBanner'
import EmptyState from '../components/ui/EmptyState'
import { mergeChartOptions } from '../components/charts/baseChartOptions'
import { formatCurrency, CLINICIAN_COLORS } from '../lib/utils'
import type { Clinician } from '../types'

function hhiLabel(hhi: number | null): string {
  if (hhi == null) return '—'
  if (hhi < 1500) return 'Unconcentrated'
  if (hhi < 2500) return 'Moderately concentrated'
  return 'Highly concentrated'
}

function monthLabel(month: string): string {
  return new Date(month).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
}

export default function Valuation() {
  const { data, isLoading, isError, error, refetch } = useValuationSnapshot()

  const donutSeries = useMemo(() => data?.payerConcentration.map(p => p.revenue) ?? [], [data])
  const donutLabels = useMemo(() => data?.payerConcentration.map(p => p.payer) ?? [], [data])

  const donutOptions: ApexOptions = mergeChartOptions({
    chart: { type: 'donut' },
    labels: donutLabels,
    legend: { position: 'bottom' },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(0)}%`,
    },
    tooltip: {
      y: { formatter: (v: number) => formatCurrency(v) },
    },
  })

  const trendCategories = data?.overheadToRevenueTrend.map(t => monthLabel(t.month)) ?? []
  const trendOptions: ApexOptions = mergeChartOptions({
    chart: { type: 'line' },
    stroke: { width: 2, curve: 'smooth' },
    xaxis: { categories: trendCategories },
    yaxis: {
      labels: { formatter: (v: number) => `${Math.round(v * 100)}%` },
    },
    tooltip: {
      y: { formatter: (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`) },
    },
    colors: ['#C9922A', '#254D54'],
  })

  const trendSeries = [
    { name: 'Overhead / Revenue', data: data?.overheadToRevenueTrend.map(t => t.ratio) ?? [] },
    { name: 'Cash Conversion',    data: data?.cashConversionTrend.map(t => t.ratio) ?? [] },
  ]

  const clinicianEntries = useMemo(() => {
    if (!data) return []
    return Object.entries(data.byClinicianRevenue).sort((a, b) => b[1] - a[1])
  }, [data])

  const maxClinicianRevenue = clinicianEntries[0]?.[1] ?? 0

  if (isLoading) return <LoadingSpinner size={20} label="Building valuation snapshot…" />
  if (isError) return <ErrorBanner message={(error as Error).message} onRetry={() => refetch()} />
  if (!data) return <EmptyState title="No valuation data available" />

  const TrendIcon = data.marginTrendDirection === 'improving' ? TrendingUp
    : data.marginTrendDirection === 'declining' ? TrendingDown
    : Minus

  const trendColor = data.marginTrendDirection === 'improving' ? 'text-success'
    : data.marginTrendDirection === 'declining' ? 'text-error'
    : 'text-muted'

  return (
    <div className="space-y-6">
      <PageHeader title="Valuation" subtitle="Practice-level financial health — payer concentration, overhead efficiency, and margin trend" />

      {!data.dataComplete && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm font-body text-amber-800">
          <AlertTriangle size={15} className="shrink-0" />
          Overhead or payroll data couldn't be read for this snapshot — overhead/margin figures below may be incomplete. Try refreshing.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          index={0}
          label="Trailing 12mo Revenue"
          value={formatCurrency(data.trailingTwelveMonthsRevenue)}
          accentColor="#254D54"
        />
        <MetricCard
          index={1}
          label="Top Payer Concentration"
          value={data.top1PayerPct != null ? `${data.top1PayerPct.toFixed(1)}%` : '—'}
          sub={data.payerConcentration[0]?.payer}
          accentColor="#F6C54D"
        />
        <MetricCard
          index={2}
          label="Top 3 Payer Concentration"
          value={data.top3PayerPct != null ? `${data.top3PayerPct.toFixed(1)}%` : '—'}
          accentColor="#3A7078"
        />
        <MetricCard
          index={3}
          label="Herfindahl Index"
          value={data.herfindahlIndex != null ? data.herfindahlIndex.toFixed(0) : '—'}
          sub={hhiLabel(data.herfindahlIndex)}
          accentColor="#C9922A"
        />
      </div>

      <Card padding="md">
        <div className="flex items-center gap-3">
          <span className={`p-2 rounded-full bg-surface-sunken ${trendColor}`}>
            <TrendIcon size={18} />
          </span>
          <div>
            <p className="text-sm font-heading font-semibold text-ink">
              Gross margin is {data.marginTrendDirection ?? 'unknown'}
            </p>
            <p className="text-xs font-body text-muted">
              {data.marginTrendSlopePctPerMonth != null
                ? `${data.marginTrendSlopePctPerMonth >= 0 ? '+' : ''}${data.marginTrendSlopePctPerMonth.toFixed(2)} points/month over the trailing 12 months`
                : 'Not enough overhead history to compute a trend'}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Payer Concentration" subtitle="Revenue share, trailing 12 months">
          {donutSeries.length > 0 ? (
            <ReactApexChart options={donutOptions} series={donutSeries} type="donut" height={300} />
          ) : (
            <p className="text-sm font-body text-muted text-center py-8">No claims in the trailing 12 months.</p>
          )}
        </ChartCard>

        <ChartCard title="Overhead Efficiency & Cash Conversion" subtitle="Monthly, trailing 12 months">
          <ReactApexChart options={trendOptions} series={trendSeries} type="line" height={300} />
        </ChartCard>
      </div>

      <Card title="Revenue by Clinician" subtitle="Trailing 12 months" padding="md">
        <div className="space-y-3">
          {clinicianEntries.length === 0 && (
            <p className="text-sm font-body text-muted">No clinician revenue in the trailing 12 months.</p>
          )}
          {clinicianEntries.map(([clinician, revenue]) => (
            <div key={clinician} className="flex items-center gap-3">
              <span className="w-16 text-sm font-ui text-ink shrink-0">{clinician}</span>
              <div className="flex-1 h-2.5 rounded-full bg-surface-sunken overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: maxClinicianRevenue > 0 ? `${(revenue / maxClinicianRevenue) * 100}%` : '0%',
                    backgroundColor: CLINICIAN_COLORS[clinician as Clinician] ?? '#254D54',
                  }}
                />
              </div>
              <span className="w-24 text-right text-sm font-body tabular-nums text-ink">{formatCurrency(revenue)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
