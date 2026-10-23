import { useMemo, useState } from 'react'
import { Copy } from 'lucide-react'
import ChartCard from '../charts/ChartCard'
import BarChart from '../charts/BarChart'
import Tabs from '../ui/Tabs'
import Button from '../ui/Button'
import ErrorBanner from '../ui/ErrorBanner'
import { SkeletonChart } from '../ui/Skeleton'
import { useClaims } from '../../hooks/useClaims'
import { useToast } from '../../context/ToastContext'
import { COLORS } from '../../lib/chartTheme'
import { CLINICIANS } from '../../types'
import type { Clinician } from '../../types'
import { computeWeekdayPattern, weekdaySummaryText, toISODate } from '../../lib/weekdayPattern'

const WINDOWS = [
  { value: '8', label: '8 wks' },
  { value: '13', label: '13 wks' },
  { value: '26', label: '26 wks' },
  { value: 'ytd', label: 'YTD' },
]

const CLINICIAN_TABS = [{ value: 'all', label: 'All' }, ...CLINICIANS.map(c => ({ value: c, label: c }))]

/** Yesterday back through N whole weeks (or Jan 1). Today is excluded because its sessions are still being entered. */
function windowRange(win: string): { from: Date; to: Date; label: string } {
  const to = new Date()
  to.setHours(0, 0, 0, 0)
  to.setDate(to.getDate() - 1)
  const from = new Date(to)
  if (win === 'ytd') {
    from.setMonth(0, 1)
    return { from, to, label: 'year to date' }
  }
  const weeks = Number(win)
  from.setDate(from.getDate() - (weeks * 7 - 1))
  return { from, to, label: `last ${weeks} weeks` }
}

export default function WeekdayPattern() {
  const toast = useToast()
  const [win, setWin] = useState('13')
  const [who, setWho] = useState<'all' | Clinician>('all')

  const { from, to, label } = useMemo(() => windowRange(win), [win])
  const fromISO = toISODate(from)
  const toISO = toISODate(to)
  const { data: claims, isLoading, isError, error } = useClaims({ from: fromISO, to: toISO })

  const pattern = useMemo(
    () => (claims ? computeWeekdayPattern(claims, from, to, who === 'all' ? undefined : who) : null),
    [claims, from, to, who],
  )

  const copySummary = async () => {
    if (!claims) return
    try {
      await navigator.clipboard.writeText(weekdaySummaryText(claims, from, to, label))
      toast.success('Weekday summary copied')
    } catch {
      toast.error('Could not copy — clipboard is unavailable')
    }
  }

  // The two busiest days get the dark fill so the front-loaded shape reads at a glance.
  const topTwo = pattern
    ? new Set([...pattern.rows].sort((a, b) => b.avgPerDay - a.avgPerDay).slice(0, 2).map(r => r.day))
    : new Set<string>()

  return (
    <ChartCard
      title="Sessions by weekday"
      subtitle={`Average completed sessions per day, by service date · ${label}`}
      actions={
        <Button variant="secondary" size="sm" icon={<Copy size={14} />} onClick={copySummary} disabled={!claims}>
          Copy summary
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Tabs tabs={CLINICIAN_TABS} value={who} onChange={v => setWho(v as 'all' | Clinician)} size="sm" />
        <Tabs tabs={WINDOWS} value={win} onChange={setWin} size="sm" />
      </div>

      {isLoading && <SkeletonChart height={220} />}
      {isError && <ErrorBanner message={(error as Error).message} />}

      {pattern && pattern.total === 0 && (
        <p className="text-sm text-muted font-body py-8 text-center">No sessions in this window.</p>
      )}

      {pattern && pattern.total > 0 && (
        <>
          <p className="text-sm font-body text-ink mb-2">
            <span className="font-ui font-semibold tabular-nums">{pattern.monTueShare.toFixed(0)}%</span>{' '}
            of sessions fall on Monday or Tuesday
            <span className="text-muted"> · {pattern.total} sessions</span>
          </p>
          <BarChart
            series={[{ name: 'Avg sessions', data: pattern.rows.map(r => Number(r.avgPerDay.toFixed(1))) }]}
            categories={pattern.rows.map(r => r.day)}
            colors={pattern.rows.map(r => (topTwo.has(r.day) ? COLORS.teal : COLORS.mutedLight))}
            distributed
            height={220}
            yFormatter={(v: number) => v.toFixed(0)}
            tooltipFormatter={(v: number) => `${v.toFixed(1)} sessions/day`}
            options={{ dataLabels: { enabled: true, formatter: (v: number) => v.toFixed(1), style: { fontSize: '11px' } } }}
          />
          <p className="text-xs font-body text-muted mt-3 tabular-nums">
            {pattern.rows.map(r => `${r.day} ${r.share.toFixed(0)}%`).join(' · ')}
          </p>
        </>
      )}
    </ChartCard>
  )
}
