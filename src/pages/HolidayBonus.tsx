import { useState } from 'react'
import { useHolidayBonus } from '../hooks/useAnalytics'
import PageHeader from '../components/layout/PageHeader'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorBanner from '../components/ui/ErrorBanner'
import Card from '../components/ui/Card'
import { formatCurrency } from '../lib/utils'
import type { HolidayBonusClinician } from '../types'

// Employer-side FICA on the bonus itself (Social Security 6.2% + Medicare 1.45%).
const EMPLOYER_FICA = 0.0765
const DAYS_PER_MONTH = 30.4375
// Per-seat vendor charges per clinician per month (2026 Distribution Model):
// SimplePractice $99.19 + Google Workspace $13.44 + Google Voice $19.90.
const DEFAULT_VENDOR_PER_MONTH = 132.53

interface Inputs { pct: number; vendorPerMonth: number; deductStripe: boolean }

function bonusFigures(c: HolidayBonusClinician, i: Inputs) {
  const vendor = (c.windowDays / DAYS_PER_MONTH) * i.vendorPerMonth
  const stripe = i.deductStripe ? c.stripeFeesCost : 0
  const profit = c.collected - c.totalPay - c.employerTaxes - vendor - stripe
  const bonus = Math.max(0, profit) * (i.pct / 100)
  return { vendor, stripe, profit, bonus }
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' })
}

function ClinicianCard({ name, data, inputs }: { name: string; data: HolidayBonusClinician; inputs: Inputs }) {
  const f = bonusFigures(data, inputs)
  const months = data.windowDays / DAYS_PER_MONTH
  const noShowPay = data.totalPay - data.sessionPay - data.adminPay - data.bonusPay
  const lines: Array<[string, number]> = [
    ['Session pay', data.sessionPay],
    ['Admin pay', data.adminPay],
    ...(noShowPay > 0.005 ? [['No-show pay (confirmed)', noShowPay] as [string, number]] : []),
    ...(data.bonusPay > 0 ? [['Bonuses already paid', data.bonusPay] as [string, number]] : []),
    ['Employer payroll taxes (est.)', data.employerTaxes],
    [`Vendor seats (${months.toFixed(1)} mo)`, f.vendor],
    ...(inputs.deductStripe ? [['Stripe fees', f.stripe] as [string, number]] : []),
  ]

  return (
    <Card padding="none">
      <div className="px-5 py-3 border-b border-border bg-surface-sunken flex items-center justify-between">
        <p className="table-th">{name}</p>
        <p className="text-xs text-muted font-body">
          since {data.windowStart} · {data.collectedClaims} claims paid
        </p>
      </div>
      <table className="w-full text-sm font-body">
        <tbody className="divide-y divide-border">
          <tr>
            <td className="px-4 py-2 text-ink">Collected in window</td>
            <td className="px-4 py-2 text-right tabular-nums text-ink">{formatCurrency(data.collected)}</td>
          </tr>
          {lines.map(([label, amt]) => (
            <tr key={label}>
              <td className="px-4 py-2 text-muted">− {label}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted">{formatCurrency(amt)}</td>
            </tr>
          ))}
          <tr className="bg-surface-sunken">
            <td className="px-4 py-2 text-ink font-medium">Profit generated</td>
            <td className="px-4 py-2 text-right tabular-nums text-ink font-medium">{formatCurrency(f.profit)}</td>
          </tr>
          <tr>
            <td className="px-4 py-2 text-ink font-medium">Bonus at {inputs.pct}%</td>
            <td className="px-4 py-2 text-right tabular-nums text-ink font-semibold">{formatCurrency(f.bonus)}</td>
          </tr>
          <tr>
            <td className="px-4 py-2 text-muted">+ Employer FICA on bonus (est.)</td>
            <td className="px-4 py-2 text-right tabular-nums text-muted">{formatCurrency(f.bonus * EMPLOYER_FICA)}</td>
          </tr>
          <tr className="bg-surface-sunken">
            <td className="px-4 py-2 text-ink font-medium">Total cost to practice</td>
            <td className="px-4 py-2 text-right tabular-nums text-ink font-medium">
              {formatCurrency(f.bonus * (1 + EMPLOYER_FICA))}
            </td>
          </tr>
        </tbody>
      </table>
    </Card>
  )
}

export default function HolidayBonus() {
  const [from, setFrom] = useState('')   // blank = each clinician's start date
  const [to, setTo] = useState('2026-11-30')
  const [pct, setPct] = useState(15)
  const [vendorPerMonth, setVendorPerMonth] = useState(DEFAULT_VENDOR_PER_MONTH)
  const [deductStripe, setDeductStripe] = useState(false)
  const { data, isLoading, isError, error } = useHolidayBonus(from, to)
  const inputs: Inputs = { pct, vendorPerMonth, deductStripe }

  const total = data
    ? bonusFigures(data.clinicians.Emily, inputs).bonus + bonusFigures(data.clinicians.Shana, inputs).bonus
    : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Holiday Bonus"
        subtitle="Cash collected in the window less pay paid in the window, for Emily and Shana"
      />

      <Card>
        <div className="flex flex-wrap items-end gap-4 font-body text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">From (blank = start date)</span>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="border border-border rounded px-2 py-1 bg-white text-ink" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Through</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="border border-border rounded px-2 py-1 bg-white text-ink" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Bonus % of profit</span>
            <input type="number" min={0} max={100} step={0.5} value={pct}
              onChange={e => setPct(Number(e.target.value) || 0)}
              className="border border-border rounded px-2 py-1 bg-white text-ink w-24" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Vendor seats $/clinician/mo</span>
            <input type="number" min={0} step={0.01} value={vendorPerMonth}
              onChange={e => setVendorPerMonth(Number(e.target.value) || 0)}
              className="border border-border rounded px-2 py-1 bg-white text-ink w-28" />
          </label>
          <label className="flex items-center gap-2 pb-1">
            <input type="checkbox" checked={deductStripe} onChange={e => setDeductStripe(e.target.checked)} />
            <span className="text-xs text-muted">Also deduct Stripe fees</span>
          </label>
        </div>
        <p className="mt-3 text-xs text-muted font-body">
          Collections count by payment date received; pay counts by pay date. Pay is the rate-card calculation and
          employer taxes are estimated, so tie both to the finalized Gusto totals before setting up the bonus.
        </p>
      </Card>

      {isLoading && <LoadingSpinner size={20} label="Calculating…" />}
      {isError && <ErrorBanner message={(error as Error).message} />}

      {data && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ClinicianCard name="Emily" data={data.clinicians.Emily} inputs={inputs} />
            <ClinicianCard name="Shana" data={data.clinicians.Shana} inputs={inputs} />
          </div>

          <p className="text-sm font-body text-ink">
            Combined bonus: <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
            {' '}· with employer FICA ≈ <span className="tabular-nums">{formatCurrency(total * (1 + EMPLOYER_FICA))}</span>
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            {(['Emily', 'Shana'] as const).map(n => (
              <div key={n} className="space-y-2">
                <h2 className="font-heading text-base font-semibold text-ink">{n} — collections by month</h2>
                <Card padding="none">
                  <table className="w-full text-sm font-body">
                    <thead>
                      <tr className="bg-surface-sunken">
                        <th className="table-th px-4 py-2 text-left">Month received</th>
                        <th className="table-th px-4 py-2 text-right">Claims</th>
                        <th className="table-th px-4 py-2 text-right">Collected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.clinicians[n].collectionsByMonth.map(m => (
                        <tr key={m.month}>
                          <td className="px-4 py-2 text-ink">{monthLabel(m.month)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-muted">{m.claims}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(m.collected)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="font-heading text-base font-semibold text-ink">Pay periods paid in the window</h2>
            <Card padding="none">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="bg-surface-sunken">
                    <th className="table-th px-4 py-2 text-left">Clinician</th>
                    <th className="table-th px-4 py-2 text-left">Pay date</th>
                    <th className="table-th px-4 py-2 text-left">Period</th>
                    <th className="table-th px-4 py-2 text-right">Sessions</th>
                    <th className="table-th px-4 py-2 text-right">Session pay</th>
                    <th className="table-th px-4 py-2 text-right">Admin</th>
                    <th className="table-th px-4 py-2 text-right">No-show</th>
                    <th className="table-th px-4 py-2 text-right">Bonus</th>
                    <th className="table-th px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(['Emily', 'Shana'] as const).flatMap(n =>
                    data.clinicians[n].periods.map(p => (
                      <tr key={`${n}-${p.periodStart}`}>
                        <td className="px-4 py-2 text-ink">{n}</td>
                        <td className="px-4 py-2 text-muted">{p.payDate}</td>
                        <td className="px-4 py-2 text-muted">{p.periodStart} – {p.periodEnd}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{p.sessions}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(p.sessionPay)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(p.adminPay)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {formatCurrency(Math.max(0, p.totalPay - p.sessionPay - p.adminPay - p.bonusPay))}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(p.bonusPay)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-ink font-medium">{formatCurrency(p.totalPay)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
