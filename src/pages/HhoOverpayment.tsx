import { Link } from 'react-router-dom'
import ReactApexChart from 'react-apexcharts'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useClaims } from '../hooks/useClaims'
import { useHhoEraLog } from '../hooks/useHhoEraLog'
import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import ChartCard from '../components/charts/ChartCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorBanner from '../components/ui/ErrorBanner'
import { mergeChartOptions } from '../components/charts/baseChartOptions'
import { formatCurrency, formatDate } from '../lib/utils'
import { SERVICE_CODES } from '../types'

function MetricCard({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'success' | 'error' | 'muted' }) {
  const toneClass = {
    default: 'text-teal',
    success: 'text-success',
    error: 'text-error',
    muted: 'text-muted',
  }[tone]
  return (
    <div className="bg-surface rounded-xl border border-border shadow-card px-5 py-4">
      <div className="text-xs font-ui text-muted uppercase tracking-wide mb-1.5">{label}</div>
      <div className={`text-2xl font-semibold font-heading tabular-nums ${toneClass}`}>{value}</div>
    </div>
  )
}

export default function HhoOverpayment() {
  const { data: claims, isLoading: claimsLoading, isError: claimsError, error: claimsErr } = useClaims()
  const { data: eraEntries, isLoading: eraLoading, isError: eraError, error: eraErr } = useHhoEraLog()

  const isLoading = claimsLoading || eraLoading
  const isError = claimsError || eraError

  const hhoClaims = (claims ?? []).filter(c => c.insurance === 'Health Options')
  const captured = hhoClaims.filter(c => c.insurancePaidHHO != null)
  const missingCapture = hhoClaims.filter(c => c.status === 'Payment Received' && c.insurancePaidHHO == null)

  const cumulativeOverUnder = captured.reduce((s, c) => s + (c.overUnderHHO ?? 0), 0)
  const sortedEntries = [...(eraEntries ?? [])].sort((a, b) => a.eraDate.localeCompare(b.eraDate))
  const latestEntry = sortedEntries[sortedEntries.length - 1]
  const actualReserveBalance = latestEntry?.runningReserveBalance
  const variance = actualReserveBalance != null ? cumulativeOverUnder - actualReserveBalance : undefined

  type CodeRow = { code: string; count: number; sum: number; avg: number }
  const byCode = SERVICE_CODES.map((code): CodeRow | null => {
    const codeClaims = captured.filter(c => c.serviceCode === code)
    if (codeClaims.length === 0) return null
    const sum = codeClaims.reduce((s, c) => s + (c.overUnderHHO ?? 0), 0)
    return { code, count: codeClaims.length, sum, avg: sum / codeClaims.length }
  }).filter((r): r is CodeRow => r !== null)
    .sort((a, b) => b.sum - a.sum)

  const chartOptions = mergeChartOptions({
    chart: { type: 'line' },
    stroke: { curve: 'smooth', width: 2.5 },
    colors: ['#254D54'],
    xaxis: { type: 'datetime', labels: { datetimeUTC: false, format: 'MMM d' } },
    yaxis: { labels: { formatter: (v: number) => formatCurrency(v) } },
    tooltip: { x: { format: 'MMM d, yyyy' }, y: { formatter: (v: number) => formatCurrency(v) } },
    markers: { size: 3 },
  })
  const chartSeries = [{
    name: 'Reserve Balance',
    data: sortedEntries.map(e => ({ x: new Date(e.eraDate).getTime(), y: e.runningReserveBalance })),
  }]

  return (
    <div className="space-y-4">
      <PageHeader
        title="HHO Overpayment"
        subtitle="Aggregate view of the Health Options over/under position, tracked per-claim but never surfaced until now"
      />

      {isLoading && <LoadingSpinner label="Loading HHO position…" />}
      {isError && <ErrorBanner message={((claimsErr ?? eraErr) as Error).message} />}

      {claims && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard label="Theoretical Over/Under Position" value={formatCurrency(cumulativeOverUnder)} />
            <MetricCard
              label="Actual Reserve Balance"
              value={actualReserveBalance != null ? formatCurrency(actualReserveBalance) : '—'}
              tone={actualReserveBalance == null ? 'muted' : 'default'}
            />
            <MetricCard
              label="Variance"
              value={variance != null ? formatCurrency(variance) : '—'}
              tone={variance == null ? 'muted' : Math.abs(variance) < 1 ? 'success' : 'error'}
            />
            <MetricCard
              label="Residual Still Due to HHO"
              value={latestEntry?.residualDueToHHO != null ? formatCurrency(latestEntry.residualDueToHHO) : '—'}
              tone={latestEntry?.residualDueToHHO ? 'error' : 'muted'}
            />
          </div>

          {missingCapture.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm font-body text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                <strong>{missingCapture.length}</strong> Health Options claim{missingCapture.length !== 1 ? 's are' : ' is'} marked
                Payment Received with no HHO Paid amount ever captured — excluded from the theoretical position above.
              </span>
            </div>
          )}

          <ChartCard title="Reserve Balance Over Time" subtitle="From logged ERA entries — accumulation vs. the current drawdown">
            {sortedEntries.length === 0 ? (
              <p className="text-sm text-muted font-body py-8 text-center">No ERA entries logged yet.</p>
            ) : (
              <ReactApexChart options={chartOptions} series={chartSeries} type="line" height={260} />
            )}
          </ChartCard>

          <Card title="Position by CPT Code" subtitle="Over/under vs. contracted rate, among claims with a captured HHO Paid amount">
            {byCode.length === 0 ? (
              <p className="text-sm text-muted font-body py-4">No Health Options claims with a captured HHO Paid amount yet.</p>
            ) : (
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="border-b border-border text-xs font-ui text-muted uppercase tracking-wide">
                    <th className="text-left py-2 pr-3">Code</th>
                    <th className="text-right py-2 pr-3">Claims</th>
                    <th className="text-right py-2 pr-3">Sum</th>
                    <th className="text-right py-2">Avg / Claim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {byCode.map(r => (
                    <tr key={r.code}>
                      <td className="py-2 pr-3 text-ink">{r.code}</td>
                      <td className="py-2 pr-3 text-right text-ink tabular-nums">{r.count}</td>
                      <td className={`py-2 pr-3 text-right tabular-nums font-medium ${r.sum < 0 ? 'text-error' : 'text-success'}`}>{formatCurrency(r.sum)}</td>
                      <td className={`py-2 text-right tabular-nums ${r.avg < 0 ? 'text-error' : 'text-success'}`}>{formatCurrency(r.avg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card
            title="Recent ERA Activity"
            actions={
              <Link to="/hho-era-log" className="text-sm font-ui text-teal hover:underline flex items-center gap-1">
                Full history <ArrowRight size={13} />
              </Link>
            }
          >
            {sortedEntries.length === 0 ? (
              <p className="text-sm text-muted font-body py-4">No ERA entries logged yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {[...sortedEntries].reverse().slice(0, 5).map(e => (
                  <div key={e.rowIndex} className="flex items-center justify-between py-2.5 text-sm font-body">
                    <div>
                      <span className="text-ink font-medium">{e.eraReference}</span>{' '}
                      <span className="text-muted text-xs">{formatDate(e.eraDate)}</span>
                    </div>
                    <span className={`tabular-nums font-medium ${e.direction === 'to-checking' ? 'text-error' : e.direction === 'to-savings' ? 'text-success' : 'text-muted'}`}>
                      {e.direction === 'none' ? '—' : formatCurrency(Math.abs(e.netTransfer))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
