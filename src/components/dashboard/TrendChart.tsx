import { useState } from 'react'
import ChartCard from '../charts/ChartCard'
import AreaChart from '../charts/AreaChart'
import Tabs from '../ui/Tabs'
import { useTrend } from '../../hooks/useAnalytics'
import { formatCurrency } from '../../lib/utils'
import type { TrendGranularity } from '../../types'

const GRANULARITY_TABS = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'quarter', label: 'Quarterly' },
  { value: 'year', label: 'Annual' },
]

type Metric = 'revenue' | 'income' | 'sessions'

const METRIC_TABS: { value: Metric; label: string }[] = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'income', label: 'Income' },
  { value: 'sessions', label: 'Sessions' },
]

const METRIC_COLOR: Record<Metric, string> = {
  revenue: '#254D54',
  income: '#16A34A',
  sessions: '#F6C54D',
}

const inputClass =
  'h-8 rounded border border-gray-200 bg-white px-2 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent'

export default function TrendChart() {
  const [granularity, setGranularity] = useState<TrendGranularity>('month')
  const [metric, setMetric] = useState<Metric>('revenue')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data, isLoading, isError } = useTrend(granularity, from || undefined, to || undefined)

  const isCurrency = metric !== 'sessions'

  return (
    <ChartCard
      title="Trend Explorer"
      subtitle="Pick an aggregation level and date range"
      actions={
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Tabs tabs={METRIC_TABS} value={metric} onChange={v => setMetric(v as Metric)} size="sm" />
          <Tabs tabs={GRANULARITY_TABS} value={granularity} onChange={v => setGranularity(v as TrendGranularity)} size="sm" />
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputClass} title="From date" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputClass} title="To date" />
        </div>
      }
    >
      {isLoading ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-muted font-body">Loading…</div>
      ) : isError || !data ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-error font-body">Failed to load trend data.</div>
      ) : data.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-muted font-body">No data for this range.</div>
      ) : (
        <AreaChart
          series={[{ name: METRIC_TABS.find(m => m.value === metric)!.label, data: data.map(d => d[metric]) }]}
          categories={data.map(d => d.label)}
          colors={[METRIC_COLOR[metric]]}
          height={260}
          yFormatter={
            isCurrency
              ? (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`)
              : (v: number) => String(Math.round(v))
          }
          tooltipFormatter={isCurrency ? (v: number) => formatCurrency(v) : (v: number) => String(v)}
          options={{
            xaxis: { labels: { rotate: -35, style: { fontSize: '10px' }, hideOverlappingLabels: true } },
          }}
        />
      )}
    </ChartCard>
  )
}
