import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import ChartCard from '../charts/ChartCard'
import AreaChart from '../charts/AreaChart'
import Tabs from '../ui/Tabs'
import { useTrend } from '../../hooks/useAnalytics'
import { formatCurrency, CLINICIAN_COLORS } from '../../lib/utils'
import { CLINICIANS } from '../../types'
import type { TrendGranularity, Clinician } from '../../types'

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
  const [selectedClinicians, setSelectedClinicians] = useState<Clinician[]>([])
  const [clinicianOpen, setClinicianOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const clinicianPopoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!clinicianOpen) return
    function handleClick(e: MouseEvent) {
      if (!clinicianPopoverRef.current?.contains(e.target as Node)) setClinicianOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [clinicianOpen])

  const toggleClinician = (c: Clinician) => {
    setSelectedClinicians(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]))
  }

  const clinicianLabel =
    selectedClinicians.length === 0
      ? 'All Clinicians'
      : selectedClinicians.length === 1
      ? selectedClinicians[0]
      : `${selectedClinicians.length} clinicians`

  const { data, isLoading, isError } = useTrend(granularity, from || undefined, to || undefined)

  const isCurrency = metric !== 'sessions'
  const metricLabel = METRIC_TABS.find(m => m.value === metric)!.label

  // With no clinicians selected, show one aggregate series across everyone.
  // With one or more selected, show one series per clinician (in a stable order).
  const activeClinicians = CLINICIANS.filter(c => selectedClinicians.includes(c))
  const series = data
    ? activeClinicians.length === 0
      ? [{ name: metricLabel, data: data.map(d => d[metric]) }]
      : activeClinicians.map(c => ({ name: c, data: data.map(d => d.byClinician[c][metric]) }))
    : []
  const colors = activeClinicians.length === 0 ? [METRIC_COLOR[metric]] : activeClinicians.map(c => CLINICIAN_COLORS[c])

  return (
    <ChartCard
      title="Trend Explorer"
      subtitle="Pick clinicians, an aggregation level, and a date range"
      actions={
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Tabs tabs={METRIC_TABS} value={metric} onChange={v => setMetric(v as Metric)} size="sm" />
          <Tabs tabs={GRANULARITY_TABS} value={granularity} onChange={v => setGranularity(v as TrendGranularity)} size="sm" />
          <div className="relative" ref={clinicianPopoverRef}>
            <button
              type="button"
              onClick={() => setClinicianOpen(o => !o)}
              className={[
                inputClass,
                'inline-flex items-center gap-1.5 cursor-pointer',
                selectedClinicians.length > 0 ? 'border-teal text-teal' : '',
              ].join(' ')}
            >
              {clinicianLabel}
              <ChevronDown size={12} className="opacity-50 shrink-0" />
            </button>
            {clinicianOpen && (
              <div className="absolute z-20 top-9 right-0 bg-white border border-gray-200 rounded-lg shadow-md py-1 min-w-40">
                {CLINICIANS.map(c => (
                  <label
                    key={c}
                    className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm font-body text-ink"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClinicians.includes(c)}
                      onChange={() => toggleClinician(c)}
                      className="rounded border-gray-300 accent-teal"
                    />
                    {c}
                  </label>
                ))}
              </div>
            )}
          </div>
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
          series={series}
          categories={data.map(d => d.label)}
          colors={colors}
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
