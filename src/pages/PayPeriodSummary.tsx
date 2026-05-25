import { useState, useMemo } from 'react'
import { Loader2, AlertCircle, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
} from 'recharts'
import { usePayPeriodList, usePartnerSummary, useEmilySummary, useSavePayrollRecord } from '../hooks/usePayPeriodSummary'
import { useEmilySubmission, useEmilyPaymentAnalysis } from '../hooks/useEmilyPayroll'
import { formatCurrency } from '../lib/utils'
import type { PartnerPeriodSummary, EmilyPayPeriodSummary, SalaryPayPeriod, HourlyPayPeriod, EmilyPaymentAnalysisRow } from '../types'

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
  const { data, isLoading, isError, error } = usePartnerSummary(selectedPeriod)
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

      {isError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-error font-body">
          <AlertCircle size={16} className="shrink-0" />
          {(error as Error).message}
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

// ─── EMILY PAY HISTORY TABLE ──────────────────────────────────────────────────

function EmilyHistoryTable({ rows }: { rows: EmilyPaymentAnalysisRow[] }) {
  const fmt = formatCurrency
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`

  if (rows.length === 0) {
    return <p className="text-sm font-body text-muted italic">No pay history available yet.</p>
  }

  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full min-w-200 px-5 text-xs font-body">
        <thead>
          <tr className="border-b border-gray-100">
            {['Period', 'Revenue', 'Received', '% by Pay Date', 'Session Pay', 'Admin Pay', 'Bonus', 'Overhead', 'Total Exp.', 'Profit', 'Margin'].map(h => (
              <th key={h} className="text-left text-muted uppercase tracking-wide font-medium pb-2 pr-3 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-gray-50">
              <td className="py-1.5 pr-3 whitespace-nowrap text-ink">{r.periodStart ? new Date(r.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}</td>
              <td className="py-1.5 pr-3 tabular-nums text-ink">{fmt(r.revenue)}</td>
              <td className="py-1.5 pr-3 tabular-nums text-success">{fmt(r.paymentsReceived)}</td>
              <td className="py-1.5 pr-3 tabular-nums text-muted">{pct(r.pctReceivedByPayDate)}</td>
              <td className="py-1.5 pr-3 tabular-nums text-ink">{fmt(r.sessionPay)}</td>
              <td className="py-1.5 pr-3 tabular-nums text-ink">{fmt(r.adminPay)}</td>
              <td className="py-1.5 pr-3 tabular-nums text-ink">{fmt(r.bonusPay)}</td>
              <td className="py-1.5 pr-3 tabular-nums text-muted">{fmt(r.overheadCosts)}</td>
              <td className="py-1.5 pr-3 tabular-nums text-muted">{fmt(r.totalExpenses)}</td>
              <td className={`py-1.5 pr-3 tabular-nums font-medium ${r.profit >= 0 ? 'text-success' : 'text-error'}`}>{fmt(r.profit)}</td>
              <td className={`py-1.5 pr-3 tabular-nums ${r.profit >= 0 ? 'text-success' : 'text-error'}`}>{pct(r.profitMargin)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const [meetingHours, setMeetingHours] = useState('')
  const [consultations, setConsultations] = useState('')
  const [bonusPay, setBonusPay] = useState('')
  const [notes, setNotes] = useState('')
  const [reconcOpen, setReconcOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const { data: rawData, isLoading, isError, error } = useEmilySummary(selectedPeriod)
  const summary = rawData as EmilyPayPeriodSummary | undefined
  const { data: submission } = useEmilySubmission(selectedPeriod)
  const { data: history, isLoading: historyLoading } = useEmilyPaymentAnalysis()
  const { mutate: saveRecord, isPending: isSaving } = useSavePayrollRecord()
  const { copied, copy } = useCopied()

  const period = periods.find(p => p.periodStart === selectedPeriod)

  // Derive display values: override inputs > submission > saved summary
  const savedMeetingH    = (summary?.meetingHours ?? 0) + (summary?.trainingHours ?? 0)
  const savedConsults    = summary?.consultations   ?? 0
  const savedBonusPay    = summary?.bonusPay        ?? 0

  const subMeetingH   = submission ? submission.adminHours.meeting    : null
  const subTrainingH  = submission ? submission.adminHours.training   : null
  const subConsults   = submission ? submission.adminHours.consultations : null

  // Use !== '' so user can explicitly type 0 without falling back to the server value
  const effMeetingH  = meetingHours  !== '' ? (parseFloat(meetingHours)  || 0) : (subMeetingH  !== null ? subMeetingH + (subTrainingH ?? 0) : savedMeetingH)
  const effConsults  = consultations !== '' ? (parseInt(consultations)   || 0) : (subConsults  ?? savedConsults)
  const effBonusP    = bonusPay      !== '' ? (parseFloat(bonusPay)      || 0) : savedBonusPay

  // Locally-computed pay values — update in real time as user edits inputs
  const adminHourlyRate = summary?.adminHourlyRate ?? 25
  const effConsultPay   = effConsults * (adminHourlyRate / 4)
  const effAdminPay     = effMeetingH * adminHourlyRate + effConsultPay
  const effTotalPay     = (summary?.sessionPay ?? 0) + effAdminPay + effBonusP
  const effOverhead     = effTotalPay * 0.0956 + 110.80
  const effTotalExp     = effTotalPay + effOverhead
  const effPaymentsRcv  = summary?.paymentsReceived ?? 0
  const effProfit       = effPaymentsRcv - effTotalExp
  const effMargin       = effPaymentsRcv > 0 ? effProfit / effPaymentsRcv : 0

  const sparklineData = (summary?.priorPeriodMargins ?? []).map((m, i) => ({ i, margin: Math.round(m * 100) }))

  const copyText = summary ? [
    `Emily Payroll Summary — ${formatPeriodLabel(summary.periodStart, summary.periodEnd)}`,
    '',
    `Therapy Sessions (${summary.therapySessions} × $${summary.therapySessionRate}): ${formatCurrency(summary.therapyPay)}`,
    `Other Sessions   (${summary.otherSessions} × $${summary.otherSessionRate}): ${formatCurrency(summary.otherPay)}`,
    `No-Shows         (${summary.noShows} × $${summary.noShowRate}): ${formatCurrency(summary.noShowPay)}`,
    `Session Pay subtotal: ${formatCurrency(summary.sessionPay)}`,
    `Admin Pay: ${formatCurrency(effAdminPay)}`,
    effBonusP > 0 ? `Bonus: ${formatCurrency(effBonusP)}` : null,
    `Total Pay: ${formatCurrency(effTotalPay)}`,
    `Overhead: ${formatCurrency(effOverhead)}`,
    `Profit: ${formatCurrency(effProfit)} (${Math.round(effMargin * 100)}% margin)`,
  ].filter(Boolean).join('\n') : ''

  const handleSave = () => {
    if (!selectedPeriod || !summary) return
    saveRecord({
      periodStart: selectedPeriod,
      periodEnd: period?.periodEnd,
      payDate: period?.payDate,
      clinician: 'Emily',
      therapySessions: summary.therapySessions,
      otherSessions: summary.otherSessions,
      noShows: summary.noShows,
      consultations: effConsults,
      meetingHours: effMeetingH,
      trainingHours: 0,
      bonusPay: effBonusP,
      notes,
    })
  }

  // Reconciliation data
  const reconcCodes = ['90837', '90791', '90834', '90832', '90847', '90846', 'Late Cancel'] as const
  const emilyReported = submission ? {
    '90837': submission.counts['90837'],
    '90791': submission.counts['90791'],
    '90834': submission.counts['90834'],
    '90832': submission.counts['90832'],
    '90847': submission.counts['90847'],
    '90846': submission.counts['90846'],
    'Late Cancel': submission.counts.lateCancel,
  } : null
  const inClaims = summary ? {
    '90837': summary.therapySessions,  // approximate — server groups by code set
    '90791': 0,                        // placeholder (server gives grouped totals)
    '90834': 0,
    '90832': 0,
    '90847': 0,
    '90846': 0,
    'Late Cancel': summary.noShows,
  } : null

  // For the reconciliation we compare total therapy vs total therapy, total other vs total other
  const reconcRows = submission && summary ? [
    { label: 'Therapy sessions (90837 + 90791)', reported: submission.counts['90837'] + submission.counts['90791'], claims: summary.therapySessions },
    { label: 'Other sessions (90834/90832/90847/90846)', reported: submission.counts['90834'] + submission.counts['90832'] + submission.counts['90847'] + submission.counts['90846'], claims: summary.otherSessions },
    { label: 'Late Cancel / No-Show', reported: submission.counts.lateCancel, claims: summary.noShows },
  ] : []
  void reconcCodes; void emilyReported; void inClaims

  const allMatch = reconcRows.length > 0 && reconcRows.every(r => r.reported === r.claims)

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

      {isError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-error font-body">
          <AlertCircle size={16} className="shrink-0" />
          {(error as Error).message}
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

          {/* Multi-rate pay breakdown */}
          <div className="border-t border-gray-100 pt-4 space-y-2 text-sm font-body">
            <div className="flex justify-between text-muted text-xs">
              <span>Therapy sessions ({summary.therapySessions} × ${summary.therapySessionRate})</span>
              <span className="tabular-nums text-ink">{formatCurrency(summary.therapyPay)}</span>
            </div>
            <div className="flex justify-between text-muted text-xs">
              <span>Other sessions ({summary.otherSessions} × ${summary.otherSessionRate})</span>
              <span className="tabular-nums text-ink">{formatCurrency(summary.otherPay)}</span>
            </div>
            <div className="flex justify-between text-muted text-xs">
              <span>No-shows ({summary.noShows} × ${summary.noShowRate})</span>
              <span className="tabular-nums text-ink">{formatCurrency(summary.noShowPay)}</span>
            </div>
            <div className="flex justify-between font-medium border-t border-dashed border-gray-200 pt-1.5 text-xs">
              <span>Session Pay subtotal</span>
              <span className="tabular-nums">{formatCurrency(summary.sessionPay)}</span>
            </div>

            {/* Admin inputs */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <label className="block">
                <span className="text-xs text-muted uppercase tracking-wide">Meeting / Training Hours</span>
                <input
                  type="number" min="0" step="0.5"
                  placeholder={String(subMeetingH != null ? subMeetingH + (subTrainingH ?? 0) : savedMeetingH)}
                  value={meetingHours}
                  onChange={e => setMeetingHours(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                />
                {submission && <p className="text-xs text-muted mt-0.5">From Emily's submission: {submission.adminHours.meeting + submission.adminHours.training}h</p>}
              </label>
              <label className="block">
                <span className="text-xs text-muted uppercase tracking-wide">Consultations</span>
                <input
                  type="number" min="0" step="1"
                  placeholder={String(subConsults != null ? subConsults : savedConsults)}
                  value={consultations}
                  onChange={e => setConsultations(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                />
                {submission && <p className="text-xs text-muted mt-0.5">From Emily's submission: {submission.adminHours.consultations}</p>}
              </label>
            </div>

            <div className="flex justify-between text-muted text-xs">
              <span>Consultations ({effConsults} × ${(adminHourlyRate / 4).toFixed(2)})</span>
              <span className="tabular-nums text-ink">{formatCurrency(effConsultPay)}</span>
            </div>
            <div className="flex justify-between text-muted text-xs">
              <span>Meeting / Training ({effMeetingH}h × ${adminHourlyRate}/hr)</span>
              <span className="tabular-nums text-ink">{formatCurrency(effMeetingH * adminHourlyRate)}</span>
            </div>
            <div className="flex justify-between font-medium border-t border-dashed border-gray-200 pt-1.5 text-xs">
              <span>Admin Pay subtotal</span>
              <span className="tabular-nums">{formatCurrency(effAdminPay)}</span>
            </div>

            <label className="block pt-1">
              <span className="text-xs text-muted uppercase tracking-wide">Bonus Pay ($)</span>
              <input
                type="number" min="0"
                placeholder={String(savedBonusPay)}
                value={bonusPay}
                onChange={e => setBonusPay(e.target.value)}
                className="mt-1 w-48 rounded border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </label>

            <div className="flex justify-between font-medium text-sm border-t-2 border-gray-200 pt-2">
              <span>Total Pay</span>
              <span className="tabular-nums text-teal text-lg font-heading">{formatCurrency(effTotalPay)}</span>
            </div>
            <div className="flex justify-between text-muted text-xs">
              <span>Overhead (pay × 9.56% + $110.80)</span>
              <span className="tabular-nums">{formatCurrency(effOverhead)}</span>
            </div>
            <div className="flex justify-between text-xs font-medium">
              <span>Total Expenses</span>
              <span className="tabular-nums">{formatCurrency(effTotalExp)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div>
                <p className="text-xs font-body text-muted">Profit</p>
                <p className={`font-heading text-xl font-semibold tabular-nums ${effProfit >= 0 ? 'text-success' : 'text-error'}`}>
                  {formatCurrency(effProfit)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-body text-muted">Margin</p>
                <p className={`font-heading text-xl font-semibold tabular-nums ${effMargin >= 0 ? 'text-success' : 'text-error'}`}>
                  {Math.round(effMargin * 100)}%
                </p>
              </div>
            </div>
          </div>

          {/* Reconciliation panel */}
          {submission && (
            <div className="border-t border-gray-100 pt-4">
              <button
                onClick={() => setReconcOpen(v => !v)}
                className="flex items-center gap-1.5 text-xs font-body font-medium text-muted uppercase tracking-wide hover:text-teal transition-colors"
              >
                {reconcOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                Submission vs. Claim Tracking
                {allMatch && <span className="ml-2 text-success">✓ Counts match</span>}
              </button>
              {reconcOpen && (
                <div className="mt-3">
                  <table className="w-full text-xs font-body">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-muted pb-1.5 font-medium">Code / Category</th>
                        <th className="text-right text-muted pb-1.5 font-medium">Emily Reported</th>
                        <th className="text-right text-muted pb-1.5 font-medium">In Claims</th>
                        <th className="text-right text-muted pb-1.5 font-medium">Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconcRows.map(r => {
                        const delta = r.reported - r.claims
                        return (
                          <tr key={r.label} className="border-t border-gray-50">
                            <td className="py-1.5 text-ink">{r.label}</td>
                            <td className="py-1.5 text-right tabular-nums">{r.reported}</td>
                            <td className="py-1.5 text-right tabular-nums">{r.claims}</td>
                            <td className={`py-1.5 text-right tabular-nums font-medium ${delta !== 0 ? 'text-amber-600' : 'text-muted'}`}>
                              {delta !== 0 ? (delta > 0 ? `+${delta}` : String(delta)) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

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

      {/* Pay Period History */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <button
          onClick={() => setHistoryOpen(v => !v)}
          className="flex items-center gap-1.5 font-heading text-base font-semibold text-ink hover:text-teal transition-colors w-full text-left"
        >
          {historyOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          Pay Period History
        </button>
        {historyOpen && (
          historyLoading ? (
            <div className="flex items-center gap-2 text-muted text-sm font-body">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : (
            <EmilyHistoryTable rows={history ?? []} />
          )
        )}
      </div>

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
