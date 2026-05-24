import { useState, useMemo } from 'react'
import { Loader2, AlertCircle, Copy, Check } from 'lucide-react'
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
} from 'recharts'
import { usePayPeriodList, usePartnerSummary, useEmilySummary, useSavePayrollRecord } from '../hooks/usePayPeriodSummary'
import { formatCurrency } from '../lib/utils'
import type { PartnerPeriodSummary, EmilyPayPeriodSummary, SalaryPayPeriod, HourlyPayPeriod } from '../types'

function formatPeriodLabel(start: string, end: string): string {
  if (!start) return '—'
  const s = new Date(start)
  const e = new Date(end)
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function useCopied() {
  const [copied, setCopied] = useState(false)
  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return { copied, copy }
}

// ─── PARTNER TAB ──────────────────────────────────────────────────────────────

function PartnerCard({ summary, }: { summary: PartnerPeriodSummary }) {
  const fmt = (n: number) => formatCurrency(n)
  const pct = (n: number) => `${Math.round(n)}%`
  const received = summary.receivedRevenue
  const pending  = summary.pendingRevenue
  const total    = summary.revenue
  const pctRecv  = total > 0 ? (received / total) * 100 : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-teal-pale flex items-center justify-center">
          <span className="font-heading text-teal font-semibold text-sm">{summary.clinician[0]}</span>
        </div>
        <h3 className="font-heading text-base font-semibold text-ink">{summary.clinician}</h3>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <dt className="text-xs font-body text-muted uppercase tracking-wide">Sessions</dt>
          <dd className="font-heading text-xl font-semibold text-ink">{summary.sessions}</dd>
        </div>
        <div>
          <dt className="text-xs font-body text-muted uppercase tracking-wide">Period Salary</dt>
          <dd className="font-heading text-xl font-semibold text-ink tabular-nums">{fmt(summary.periodSalary)}</dd>
        </div>
        <div>
          <dt className="text-xs font-body text-muted uppercase tracking-wide">Revenue Generated</dt>
          <dd className="font-heading text-base font-semibold text-ink tabular-nums">{fmt(total)}</dd>
        </div>
        <div>
          <dt className="text-xs font-body text-muted uppercase tracking-wide">Received</dt>
          <dd className="font-heading text-base font-semibold text-success tabular-nums">{fmt(received)}</dd>
        </div>
        <div>
          <dt className="text-xs font-body text-muted uppercase tracking-wide">Pending</dt>
          <dd className="font-heading text-base font-semibold text-muted tabular-nums">{fmt(pending)}</dd>
        </div>
        <div>
          <dt className="text-xs font-body text-muted uppercase tracking-wide">Pct Received</dt>
          <dd className={`font-heading text-base font-semibold tabular-nums ${pctRecv >= 80 ? 'text-success' : 'text-amber-600'}`}>{pct(pctRecv)}</dd>
        </div>
      </dl>

      <div className="text-xs font-body text-muted border-t border-gray-100 pt-3">
        Annual salary reference: {fmt(summary.annualSalary)} — Salary component only; quarterly distributions are tracked separately.
      </div>
    </div>
  )
}

function PartnerTab({ periods }: { periods: SalaryPayPeriod[] }) {
  const mostRecent = useMemo(() => {
    const past = periods.filter(p => new Date(p.periodEnd) < new Date())
    return past.length > 0 ? past[past.length - 1].periodStart : periods[0]?.periodStart ?? ''
  }, [periods])

  const [selectedPeriod, setSelectedPeriod] = useState(mostRecent)
  const { data, isLoading } = usePartnerSummary(selectedPeriod)
  const summaries = data as PartnerPeriodSummary[] | undefined
  const { copied, copy } = useCopied()

  const copyText = useMemo(() => {
    if (!summaries) return ''
    const period = periods.find(p => p.periodStart === selectedPeriod)
    const lines = [
      `Partner Payroll Summary — ${formatPeriodLabel(period?.periodStart ?? '', period?.periodEnd ?? '')}`,
      '',
      ...(summaries).map(s => [
        `${s.clinician}`,
        `  Sessions: ${s.sessions}`,
        `  Revenue: ${formatCurrency(s.revenue)}`,
        `  Received: ${formatCurrency(s.receivedRevenue)} | Pending: ${formatCurrency(s.pendingRevenue)}`,
        `  Period Salary: ${formatCurrency(s.periodSalary)}`,
      ].join('\n')),
    ]
    return lines.join('\n')
  }, [summaries, selectedPeriod, periods])

  const period = periods.find(p => p.periodStart === selectedPeriod)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-body text-muted uppercase tracking-wide mb-1">Pay Period</p>
          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            className="text-sm font-body text-ink border border-gray-200 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal"
          >
            {[...periods].reverse().map(p => (
              <option key={p.periodStart} value={p.periodStart}>
                {formatPeriodLabel(p.periodStart, p.periodEnd)}
              </option>
            ))}
          </select>
        </div>
        {period && (
          <div className="text-xs font-body text-muted">
            Pay Date: <span className="font-medium text-ink">{period.payDate ? new Date(period.payDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
          </div>
        )}
        <button
          onClick={() => copy(copyText)}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-sm font-body text-muted rounded hover:bg-gray-50 transition-colors"
        >
          {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy summary'}
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted">
          <Loader2 size={18} className="animate-spin mr-2" />
          <span className="text-sm font-body">Loading…</span>
        </div>
      )}

      {summaries && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summaries.map(s => <PartnerCard key={s.clinician} summary={s} />)}
        </div>
      )}

      <p className="text-xs font-body text-muted italic">Revenue generated this period — reference only, not a payroll calculation.</p>
    </div>
  )
}

// ─── EMILY TAB ────────────────────────────────────────────────────────────────

function EmilyTab({ periods }: { periods: HourlyPayPeriod[] }) {
  const mostRecent = useMemo(() => {
    const past = periods.filter(p => new Date(p.periodEnd) < new Date())
    return past.length > 0 ? past[past.length - 1].periodStart : periods[0]?.periodStart ?? ''
  }, [periods])

  const [selectedPeriod, setSelectedPeriod] = useState(mostRecent)
  const [adminHours, setAdminHours] = useState('')
  const [bonusPay, setBonusPay] = useState('')
  const [notes, setNotes] = useState('')

  const { data: rawData, isLoading } = useEmilySummary(selectedPeriod)
  const summary = rawData as EmilyPayPeriodSummary | undefined
  const { mutate: saveRecord, isPending: isSaving } = useSavePayrollRecord()
  const { copied, copy } = useCopied()

  // Sync admin hours from saved data when period changes
  const savedAdminHours = summary?.adminHours ?? 0
  const savedBonusPay   = summary?.bonusPay   ?? 0

  const adminH   = parseFloat(adminHours) || savedAdminHours
  const bonusP   = parseFloat(bonusPay)   || savedBonusPay
  const sessionP = (summary?.sessions ?? 0) * (summary?.sessionRate ?? 75)
  const adminP   = adminH * (summary?.adminHourlyRate ?? 25)
  const totalP   = sessionP + adminP + bonusP

  const period = periods.find(p => p.periodStart === selectedPeriod)

  const copyText = summary ? [
    `Emily Payroll Summary — ${formatPeriodLabel(summary.periodStart, summary.periodEnd)}`,
    '',
    `Sessions: ${summary.sessions}`,
    `Revenue: ${formatCurrency(summary.revenue)}`,
    `Payments Received: ${formatCurrency(summary.paymentsReceived)} (${Math.round(summary.pctReceivedByPayDate * 100)}%)`,
    '',
    `Session Pay: ${summary.sessions} × $${summary.sessionRate} = ${formatCurrency(sessionP)}`,
    `Admin Pay: ${adminH}h × $${summary.adminHourlyRate} = ${formatCurrency(adminP)}`,
    bonusP > 0 ? `Bonus: ${formatCurrency(bonusP)}` : null,
    `Total Pay: ${formatCurrency(totalP)}`,
  ].filter(Boolean).join('\n') : ''

  const handleSave = () => {
    if (!selectedPeriod) return
    saveRecord({
      periodStart: selectedPeriod,
      periodEnd: period?.periodEnd,
      payDate: period?.payDate,
      clinician: 'Emily',
      adminHours: parseFloat(adminHours) || 0,
      bonusPay: parseFloat(bonusPay) || 0,
      notes,
    })
  }

  const sparklineData = (summary?.priorPeriodMargins ?? []).map((m, i) => ({ i, margin: Math.round(m * 100) }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-body text-muted uppercase tracking-wide mb-1">Pay Period</p>
          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            className="text-sm font-body text-ink border border-gray-200 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal"
          >
            {[...periods].reverse().map(p => (
              <option key={p.periodStart} value={p.periodStart}>
                {formatPeriodLabel(p.periodStart, p.periodEnd)}
              </option>
            ))}
          </select>
        </div>
        {period && (
          <div className="text-xs font-body text-muted">
            Pay Date: <span className="font-medium text-ink">{period.payDate ? new Date(period.payDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
          </div>
        )}
        <button
          onClick={() => copy(copyText)}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-sm font-body text-muted rounded hover:bg-gray-50 transition-colors"
        >
          {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy summary'}
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted">
          <Loader2 size={18} className="animate-spin mr-2" />
          <span className="text-sm font-body">Loading…</span>
        </div>
      )}

      {summary && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
          {/* Header with sparkline */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-heading text-base font-semibold text-ink">Emily Bryant</h3>
              <p className="text-xs font-body text-muted mt-0.5">W-2 Employee</p>
            </div>
            {sparklineData.length > 1 && (
              <div>
                <p className="text-xs font-body text-muted text-right mb-1">Prior period margins</p>
                <ResponsiveContainer width={120} height={32}>
                  <LineChart data={sparklineData}>
                    <Line type="monotone" dataKey="margin" stroke="#254D54" strokeWidth={1.5} dot={false} />
                    <Tooltip formatter={(v: unknown) => `${v}%`} contentStyle={{ fontSize: 11, fontFamily: 'DM Sans' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Activity */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-body text-muted">Sessions</p>
              <p className="font-heading text-xl font-semibold text-ink">{summary.sessions}</p>
            </div>
            <div>
              <p className="text-xs font-body text-muted">Revenue</p>
              <p className="font-heading text-xl font-semibold text-ink tabular-nums">{formatCurrency(summary.revenue)}</p>
            </div>
            <div>
              <p className="text-xs font-body text-muted">Received</p>
              <p className="font-heading text-xl font-semibold text-success tabular-nums">{formatCurrency(summary.paymentsReceived)}</p>
              <p className="text-xs text-muted font-body">{Math.round(summary.pctReceivedByPayDate * 100)}% collected</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-body text-muted">Session Pay ({summary.sessions} × ${summary.sessionRate})</p>
                <p className="font-heading text-base font-semibold text-ink tabular-nums">{formatCurrency(sessionP)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-body text-muted uppercase tracking-wide">Admin Hours</span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder={String(savedAdminHours)}
                    value={adminHours}
                    onChange={e => setAdminHours(e.target.value)}
                    className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal"
                  />
                  <span className="text-xs text-muted font-body whitespace-nowrap">@ ${summary.adminHourlyRate}/hr = {formatCurrency(adminP)}</span>
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-body text-muted uppercase tracking-wide">Bonus Pay ($)</span>
                <input
                  type="number"
                  min="0"
                  placeholder={String(savedBonusPay)}
                  value={bonusPay}
                  onChange={e => setBonusPay(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-200 px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </label>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div>
                <p className="text-xs font-body text-muted">Total Pay</p>
                <p className="font-heading text-2xl font-semibold text-teal tabular-nums">{formatCurrency(totalP)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-body text-muted">Profit (est.)</p>
                <p className={`font-heading text-xl font-semibold tabular-nums ${summary.profit >= 0 ? 'text-success' : 'text-error'}`}>
                  {formatCurrency(summary.profit)}
                </p>
                <p className="text-xs text-muted font-body">{Math.round(summary.profitMargin * 100)}% margin</p>
              </div>
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-body text-muted uppercase tracking-wide">Notes</span>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional period notes…"
              className="mt-1 w-full rounded border border-gray-200 px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </label>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal text-white text-sm font-body rounded hover:bg-teal-mid transition-colors disabled:opacity-60"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Save Payroll Record
          </button>
        </div>
      )}

      <p className="text-xs font-body text-muted italic">Revenue generated this period — reference only, not a payroll calculation.</p>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function PayPeriodSummary() {
  const { data: periodLists, isLoading, isError, error } = usePayPeriodList()
  const [tab, setTab] = useState<'partner' | 'emily'>('partner')

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-xl font-semibold text-ink">Pay Periods</h1>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted">
          <Loader2 size={20} className="animate-spin mr-2" />
          <span className="text-sm font-body">Loading periods…</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-error font-body">
          <AlertCircle size={16} className="shrink-0" />
          {(error as Error).message}
        </div>
      )}

      {periodLists && (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-gray-200">
            {(['partner', 'emily'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  'px-5 py-2.5 text-sm font-body -mb-px border-b-2 transition-colors',
                  tab === t
                    ? 'border-teal text-teal font-medium'
                    : 'border-transparent text-muted hover:text-ink',
                ].join(' ')}
              >
                {t === 'partner' ? 'Partner Payroll' : 'Emily Payroll'}
              </button>
            ))}
          </div>

          {tab === 'partner' && <PartnerTab periods={periodLists.salaryPeriods} />}
          {tab === 'emily'   && <EmilyTab   periods={periodLists.hourlyPeriods} />}
        </>
      )}
    </div>
  )
}
