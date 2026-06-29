import { useState, useMemo } from 'react'
import { Copy, Check } from 'lucide-react'
import { usePayPeriodList, usePartnerSummary } from '../hooks/usePayPeriodSummary'
import { formatCurrency } from '../lib/utils'
import PageHeader from '../components/layout/PageHeader'
import Tabs from '../components/ui/Tabs'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorBanner from '../components/ui/ErrorBanner'
import PartnerCard from '../components/payroll/PartnerCard'
import HourlyClinicianPayroll from '../components/payroll/HourlyClinicianPayroll'
import type { PartnerPeriodSummary, SalaryPayPeriod } from '../types'

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
          className="w-full sm:w-64"
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

      {summaries && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summaries.map(s => <PartnerCard key={s.clinician} summary={s} />)}
        </div>
      )}

      <p className="text-xs font-body text-muted italic">Revenue generated this period — reference only, not a payroll calculation.</p>
    </div>
  )
}

export default function PayPeriodSummary() {
  const { data: periodLists, isLoading, isError, error } = usePayPeriodList()
  const [tab, setTab] = useState<string>('partner')

  return (
    <div className="space-y-4">
      <PageHeader title="Pay Periods" />

      {isLoading && <LoadingSpinner label="Loading periods…" />}
      {isError && <ErrorBanner message={(error as Error).message} />}

      {periodLists && (
        <>
          <Tabs
            tabs={[
              { value: 'partner', label: 'Partner Payroll' },
              { value: 'emily', label: 'Emily Payroll' },
              { value: 'shana', label: 'Shana Payroll' },
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === 'partner' && <PartnerTab periods={periodLists.salaryPeriods} />}
          {tab === 'emily' && (
            <HourlyClinicianPayroll
              clinician="Emily"
              clinicianFullName="Emily Bryant"
              periods={periodLists.hourlyPeriods}
            />
          )}
          {tab === 'shana' && (
            <HourlyClinicianPayroll
              clinician="Shana"
              clinicianFullName="Shana Petruccelli"
              periods={periodLists.hourlyPeriods}
            />
          )}
        </>
      )}
    </div>
  )
}
