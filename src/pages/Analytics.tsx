import { useMemo, useState } from 'react'
import { Loader2, AlertCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  ReferenceLine, Cell, ComposedChart,
} from 'recharts'
import { useCaseloadTrends } from '../hooks/useAnalytics'
import { useQuarterlySummary } from '../hooks/useQuarterlySummary'
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
  highlight: '#DC2626',
}

function monthLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function pct(val: number | null): string {
  if (val === null) return '—'
  // Sheet stores util % as whole numbers (e.g. 94.6 = 94.6%)
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

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-base font-semibold text-ink">Financial Performance</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.revenue} stopOpacity={0.15} />
                <stop offset="95%" stopColor={COLORS.revenue} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.income} stopOpacity={0.12} />
                <stop offset="95%" stopColor={COLORS.income} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
            <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fontFamily: 'DM Sans' }} width={52} />
            <Tooltip
              formatter={(v: unknown, name: unknown) => [formatCurrency(v as number), name as string]}
              contentStyle={{ fontSize: 12, fontFamily: 'DM Sans' }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontFamily: 'DM Sans' }} />
            <Area type="monotone" dataKey="revenue"  name="Revenue"  stroke={COLORS.revenue}  fill="url(#gradRevenue)" strokeWidth={2} dot={false} connectNulls />
            <Area type="monotone" dataKey="income"   name="Income"   stroke={COLORS.income}   fill="url(#gradIncome)"  strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="overhead" name="Overhead" stroke={COLORS.overhead} strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls />
            <Line type="monotone" dataKey="margin"   name="Gross Margin" stroke={COLORS.margin} strokeWidth={2} dot={false} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
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
  ]

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-base font-semibold text-ink">Clinician Productivity</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-xs text-muted font-body mb-3">Sessions by clinician — last 6 months</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
            <YAxis tick={{ fontSize: 11, fontFamily: 'DM Sans' }} width={32} />
            <Tooltip contentStyle={{ fontSize: 12, fontFamily: 'DM Sans' }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontFamily: 'DM Sans' }} />
            <Bar dataKey="Shannon" fill={COLORS.shannon} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Jen"     fill={COLORS.jen}     radius={[3, 3, 0, 0]} />
            <Bar dataKey="Emily"   fill={COLORS.emily}   radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
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

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-base font-semibold text-ink">Revenue Per Session</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
            <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11, fontFamily: 'DM Sans' }} width={52} />
            <Tooltip
              formatter={(v: unknown) => [formatCurrency(v as number), 'Revenue/Session']}
              contentStyle={{ fontSize: 12, fontFamily: 'DM Sans' }}
            />
            <Line type="monotone" dataKey="rps" name="Revenue/Session" stroke={COLORS.revenue} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
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

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-base font-semibold text-ink">Collection Efficiency</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-xs text-muted font-body mb-3">
          Collection variance by month (positive = under-collected vs billed; negative = over-collected).
          Red bars exceed ±$2,000.
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
            <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fontFamily: 'DM Sans' }} width={52} />
            <Tooltip
              formatter={(v: unknown) => [formatCurrency(v as number), 'Variance']}
              contentStyle={{ fontSize: 12, fontFamily: 'DM Sans' }}
            />
            <ReferenceLine y={0} stroke="#9CA3AF" strokeWidth={1} />
            <Bar dataKey="variance" name="Variance" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
                <YAxis yAxisId="left" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fontFamily: 'DM Sans' }} width={52} />
                <YAxis yAxisId="right" orientation="right" unit="%" tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fontFamily: 'DM Sans' }} width={40} />
                <Tooltip
                  formatter={(v: unknown, name: unknown) => name === 'Margin %' ? `${v}%` : formatCurrency(v as number)}
                  contentStyle={{ fontSize: 12, fontFamily: 'DM Sans' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontFamily: 'DM Sans' }} />
                <Bar yAxisId="left" dataKey="Revenue" fill="#E8F1F2" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="left" dataKey="Income"  fill="#3A7078" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="left" dataKey="Profit"  fill="#254D54" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="marginPct" name="Margin %" stroke="#F6C54D" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
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
