import { useState, useMemo, useEffect } from 'react'
import { Loader2, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'
import ReactApexChart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { useHourlySummary, useSavePayrollRecord } from '../../hooks/usePayPeriodSummary'
import { useHourlySubmission, useHourlyPaymentAnalysis } from '../../hooks/useEmilyPayroll'
import { formatCurrency } from '../../lib/utils'
import Card from '../ui/Card'
import Avatar from '../ui/Avatar'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import LoadingSpinner from '../ui/LoadingSpinner'
import ErrorBanner from '../ui/ErrorBanner'
import PayHistoryTable from './PayHistoryTable'
import type { Clinician, EmilyPayPeriodSummary, HourlyPayPeriod, EmilySubmission } from '../../types'

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

interface Props {
  clinician: Clinician
  clinicianFullName: string
  periods: HourlyPayPeriod[]
}

export default function HourlyClinicianPayroll({ clinician, clinicianFullName, periods }: Props) {
  const mostRecent = useMemo(() => {
    const past = periods.filter(p => new Date(p.periodEnd) < new Date())
    return past.length > 0 ? past[past.length - 1].periodStart : periods[0]?.periodStart ?? ''
  }, [periods])

  const [selectedPeriod, setSelectedPeriod] = useState(mostRecent)
  const [therapySessions, setTherapySessions] = useState('')
  const [otherSessions, setOtherSessions] = useState('')
  const [noShows, setNoShows] = useState('')
  const [meetingHours, setMeetingHours] = useState('')
  const [consultations, setConsultations] = useState('')
  const [bonusPay, setBonusPay] = useState('')
  const [notes, setNotes] = useState('')
  const [reconcOpen, setReconcOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const { data: rawData, isLoading, isError, error } = useHourlySummary(clinician, selectedPeriod)
  const summary = rawData as EmilyPayPeriodSummary | undefined
  const { data: submission } = useHourlySubmission(clinician, selectedPeriod)
  const { data: history, isLoading: historyLoading } = useHourlyPaymentAnalysis(clinician)
  const { mutate: saveRecord, isPending: isSaving } = useSavePayrollRecord()
  const { copied, copy } = useCopied()

  useEffect(() => {
    setTherapySessions('')
    setOtherSessions('')
    setNoShows('')
    setMeetingHours('')
    setConsultations('')
    setBonusPay('')
    setNotes('')
  }, [selectedPeriod])

  const period = periods.find(p => p.periodStart === selectedPeriod)

  const savedMeetingH    = (summary?.meetingHours ?? 0) + (summary?.trainingHours ?? 0)
  const savedConsults    = summary?.consultations   ?? 0
  const savedBonusPay    = summary?.bonusPay        ?? 0

  const sub = submission as EmilySubmission | null | undefined
  const subMeetingH   = sub ? sub.adminHours.meeting    : null
  const subTrainingH  = sub ? sub.adminHours.training   : null
  const subConsults   = sub ? sub.adminHours.consultations : null

  const effTherapySessions = therapySessions !== '' ? (parseInt(therapySessions) || 0) : (summary?.therapySessions ?? 0)
  const effOtherSessions   = otherSessions   !== '' ? (parseInt(otherSessions)   || 0) : (summary?.otherSessions   ?? 0)
  const effNoShows         = noShows         !== '' ? (parseInt(noShows)         || 0) : (summary?.noShows         ?? 0)
  const effMeetingH        = meetingHours    !== '' ? (parseFloat(meetingHours)  || 0) : (subMeetingH !== null ? subMeetingH + (subTrainingH ?? 0) : savedMeetingH)
  const effConsults        = consultations   !== '' ? (parseInt(consultations)   || 0) : (subConsults  ?? savedConsults)
  const effBonusP          = bonusPay        !== '' ? (parseFloat(bonusPay)      || 0) : savedBonusPay

  const adminHourlyRate = summary?.adminHourlyRate ?? 25
  const effTherapyPay   = effTherapySessions * (summary?.therapySessionRate ?? 50)
  const effOtherPay     = effOtherSessions   * (summary?.otherSessionRate   ?? 40)
  const effNoShowPay    = effNoShows         * (summary?.noShowRate         ?? 40)
  const effSessionPay   = effTherapyPay + effOtherPay + effNoShowPay
  const effConsultPay   = effConsults * (adminHourlyRate / 4)
  const effAdminPay     = effMeetingH * adminHourlyRate + effConsultPay
  const effTotalPay     = effSessionPay + effAdminPay + effBonusP
  const effOverhead     = effTotalPay * 0.0956 + 110.80
  const effTotalExp     = effTotalPay + effOverhead
  const effPaymentsRcv  = summary?.paymentsReceived ?? 0
  const effProfit       = effPaymentsRcv - effTotalExp
  const effMargin       = effPaymentsRcv > 0 ? effProfit / effPaymentsRcv : 0

  const sparklineData = (summary?.priorPeriodMargins ?? []).map((m, i) => ({ i, margin: Math.round(m * 100) }))

  const copyText = summary ? [
    `${clinicianFullName} Payroll Summary — ${formatPeriodLabel(summary.periodStart, summary.periodEnd)}`,
    '',
    `Therapy Sessions (${effTherapySessions} × $${summary.therapySessionRate}): ${formatCurrency(effTherapyPay)}`,
    `Other Sessions   (${effOtherSessions} × $${summary.otherSessionRate}): ${formatCurrency(effOtherPay)}`,
    `No-Shows         (${effNoShows} × $${summary.noShowRate}): ${formatCurrency(effNoShowPay)}`,
    `Session Pay subtotal: ${formatCurrency(effSessionPay)}`,
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
      clinician,
      therapySessions: effTherapySessions,
      otherSessions: effOtherSessions,
      noShows: effNoShows,
      consultations: effConsults,
      meetingHours: effMeetingH,
      trainingHours: 0,
      bonusPay: effBonusP,
      notes: notes || summary.savedNotes || '',
    }, {
      onSuccess: () => {
        setTherapySessions('')
        setOtherSessions('')
        setNoShows('')
        setMeetingHours('')
        setConsultations('')
        setBonusPay('')
        setNotes('')
      },
    })
  }

  const reconcRows = sub && summary ? [
    { label: 'Therapy sessions (90837 + 90791)', reported: sub.counts['90837'] + sub.counts['90791'], claims: summary.claimsTherapySessions },
    { label: 'Other sessions (90834/90832/90847/90846)', reported: sub.counts['90834'] + sub.counts['90832'] + sub.counts['90847'] + sub.counts['90846'], claims: summary.claimsOtherSessions },
    { label: 'Late Cancel / No-Show', reported: sub.counts.lateCancel, claims: summary.claimsNoShows },
  ] : []

  const allMatch = reconcRows.length > 0 && reconcRows.every(r => r.reported === r.claims)

  const periodOptions = [...periods].reverse().map(p => ({
    value: p.periodStart,
    label: formatPeriodLabel(p.periodStart, p.periodEnd),
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Select
          label="Pay Period"
          value={selectedPeriod}
          onChange={e => setSelectedPeriod(e.target.value)}
          options={periodOptions}
          className="w-64"
        />
        {period && (
          <div className="text-xs font-body text-muted">
            Pay Date: <span className="font-medium text-ink">{period.payDate ? new Date(period.payDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
          </div>
        )}
        <Button
          variant="secondary"
          size="sm"
          icon={copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
          onClick={() => copy(copyText)}
        >
          {copied ? 'Copied!' : 'Copy summary'}
        </Button>
      </div>

      {isLoading && <LoadingSpinner label="Loading…" />}
      {isError && <ErrorBanner message={(error as Error).message} />}

      {summary && (
        <Card>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar name={clinicianFullName} size="lg" />
              <div>
                <h3 className="font-heading text-base font-semibold text-ink">{clinicianFullName}</h3>
                <p className="text-xs font-body text-muted mt-0.5">W-2 Employee</p>
              </div>
            </div>
            {sparklineData.length > 1 && (
              <div>
                <p className="text-xs font-body text-muted text-right mb-1">Prior period margins</p>
                <ReactApexChart
                  options={{
                    chart: {
                      type: 'line',
                      sparkline: { enabled: true },
                      animations: { enabled: false },
                    },
                    stroke: { curve: 'smooth', width: 1.5 },
                    colors: ['#254D54'],
                    tooltip: { enabled: false },
                  } as ApexOptions}
                  series={[{ data: sparklineData.map(d => d.margin) }]}
                  type="line"
                  width={120}
                  height={32}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <p className="text-xs font-ui text-muted uppercase tracking-wide">Sessions</p>
              <p className="font-heading text-xl font-semibold text-ink">{effTherapySessions + effOtherSessions + effNoShows}</p>
            </div>
            <div>
              <p className="text-xs font-ui text-muted uppercase tracking-wide">Revenue</p>
              <p className="font-heading text-xl font-semibold text-ink tabular-nums">{formatCurrency(summary.revenue)}</p>
            </div>
            <div>
              <p className="text-xs font-ui text-muted uppercase tracking-wide">Received</p>
              <p className="font-heading text-xl font-semibold text-success tabular-nums">{formatCurrency(summary.paymentsReceived)}</p>
              <p className="text-xs text-muted font-body">{Math.round(summary.pctReceivedByPayDate * 100)}% collected</p>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-2 text-sm font-body">
            <div className="flex items-center justify-between text-muted text-xs">
              <span className="flex items-center gap-1">
                Therapy sessions (
                <input
                  type="number" min="0" step="1"
                  placeholder={String(summary.therapySessions)}
                  value={therapySessions}
                  onChange={e => setTherapySessions(e.target.value)}
                  className="w-12 rounded-lg border border-border px-1 py-0.5 text-xs text-center text-ink focus:outline-none focus:ring-1 focus:ring-teal"
                />
                × ${summary.therapySessionRate})
              </span>
              <span className="tabular-nums text-ink">{formatCurrency(effTherapyPay)}</span>
            </div>
            <div className="flex items-center justify-between text-muted text-xs">
              <span className="flex items-center gap-1">
                Other sessions (
                <input
                  type="number" min="0" step="1"
                  placeholder={String(summary.otherSessions)}
                  value={otherSessions}
                  onChange={e => setOtherSessions(e.target.value)}
                  className="w-12 rounded-lg border border-border px-1 py-0.5 text-xs text-center text-ink focus:outline-none focus:ring-1 focus:ring-teal"
                />
                × ${summary.otherSessionRate})
              </span>
              <span className="tabular-nums text-ink">{formatCurrency(effOtherPay)}</span>
            </div>
            <div className="flex items-center justify-between text-muted text-xs">
              <span className="flex items-center gap-1">
                No-shows (
                <input
                  type="number" min="0" step="1"
                  placeholder={String(summary.noShows)}
                  value={noShows}
                  onChange={e => setNoShows(e.target.value)}
                  className="w-12 rounded-lg border border-border px-1 py-0.5 text-xs text-center text-ink focus:outline-none focus:ring-1 focus:ring-teal"
                />
                × ${summary.noShowRate})
              </span>
              <span className="tabular-nums text-ink">{formatCurrency(effNoShowPay)}</span>
            </div>
            <div className="flex justify-between font-medium border-t border-dashed border-border pt-1.5 text-xs">
              <span>Session Pay subtotal</span>
              <span className="tabular-nums">{formatCurrency(effSessionPay)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <Input
                  label="Meeting / Training Hours"
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder={String(subMeetingH != null ? subMeetingH + (subTrainingH ?? 0) : savedMeetingH)}
                  value={meetingHours}
                  onChange={e => setMeetingHours(e.target.value)}
                  hint={sub ? `From submission: ${sub.adminHours.meeting + sub.adminHours.training}h` : undefined}
                />
              </div>
              <div>
                <Input
                  label="Consultations"
                  type="number"
                  min={0}
                  step={1}
                  placeholder={String(subConsults != null ? subConsults : savedConsults)}
                  value={consultations}
                  onChange={e => setConsultations(e.target.value)}
                  hint={sub ? `From submission: ${sub.adminHours.consultations}` : undefined}
                />
              </div>
            </div>

            <div className="flex justify-between text-muted text-xs">
              <span>Consultations ({effConsults} × ${(adminHourlyRate / 4).toFixed(2)})</span>
              <span className="tabular-nums text-ink">{formatCurrency(effConsultPay)}</span>
            </div>
            <div className="flex justify-between text-muted text-xs">
              <span>Meeting / Training ({effMeetingH}h × ${adminHourlyRate}/hr)</span>
              <span className="tabular-nums text-ink">{formatCurrency(effMeetingH * adminHourlyRate)}</span>
            </div>
            <div className="flex justify-between font-medium border-t border-dashed border-border pt-1.5 text-xs">
              <span>Admin Pay subtotal</span>
              <span className="tabular-nums">{formatCurrency(effAdminPay)}</span>
            </div>

            <Input
              label="Bonus Pay ($)"
              type="number"
              min={0}
              placeholder={String(savedBonusPay)}
              value={bonusPay}
              onChange={e => setBonusPay(e.target.value)}
              className="pt-1 w-48"
            />

            <div className="flex justify-between font-medium text-sm border-t-2 border-border pt-2">
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
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div>
                <p className="text-xs font-ui text-muted">Profit</p>
                <p className={`font-heading text-xl font-semibold tabular-nums ${effProfit >= 0 ? 'text-success' : 'text-error'}`}>
                  {formatCurrency(effProfit)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-ui text-muted">Margin</p>
                <p className={`font-heading text-xl font-semibold tabular-nums ${effMargin >= 0 ? 'text-success' : 'text-error'}`}>
                  {Math.round(effMargin * 100)}%
                </p>
              </div>
            </div>
          </div>

          {sub && (
            <div className="border-t border-border pt-4 mt-4">
              <button
                onClick={() => setReconcOpen(v => !v)}
                className="flex items-center gap-1.5 text-xs font-ui font-medium text-muted uppercase tracking-wide hover:text-teal transition-colors"
              >
                {reconcOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                Submission vs. Claim Tracking
                {allMatch && <span className="ml-2 text-success">✓ Counts match</span>}
              </button>
              {reconcOpen && (
                <div className="mt-3">
                  <table className="w-full text-xs font-body">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-muted pb-1.5 font-medium font-ui">Code / Category</th>
                        <th className="text-right text-muted pb-1.5 font-medium font-ui">Reported</th>
                        <th className="text-right text-muted pb-1.5 font-medium font-ui">In Claims</th>
                        <th className="text-right text-muted pb-1.5 font-medium font-ui">Delta</th>
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

          <Input
            label="Notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={summary.savedNotes || 'Optional period notes…'}
            className="mt-4"
          />

          <Button onClick={handleSave} loading={isSaving} className="mt-4">
            Save Payroll Record
          </Button>
        </Card>
      )}

      <Card>
        <button
          onClick={() => setHistoryOpen(v => !v)}
          className="flex items-center gap-1.5 font-heading text-base font-semibold text-ink hover:text-teal transition-colors w-full text-left"
        >
          {historyOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          Pay Period History
        </button>
        {historyOpen && (
          historyLoading ? (
            <div className="flex items-center gap-2 text-muted text-sm font-body mt-3">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : (
            <div className="mt-3">
              <PayHistoryTable rows={history ?? []} />
            </div>
          )
        )}
      </Card>

      <p className="text-xs font-body text-muted italic">Revenue generated this period — reference only, not a payroll calculation.</p>
    </div>
  )
}
