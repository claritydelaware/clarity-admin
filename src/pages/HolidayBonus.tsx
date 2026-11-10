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

type Basis = 'revenue' | 'cash'

interface Inputs { pct: number; basis: Basis; vendorPerMonth: number; deductStripe: boolean }

function bonusFigures(c: HolidayBonusClinician, i: Inputs) {
  const income = i.basis === 'revenue' ? c.revenue : c.paymentsReceived
  const vendor = (c.windowDays / DAYS_PER_MONTH) * i.vendorPerMonth
  const stripe = i.deductStripe ? c.stripeFeesCost : 0
  const profit = income - c.totalPay - c.overheadCosts - vendor - stripe
  const bonus = Math.max(0, profit) * (i.pct / 100)
  return { income, vendor, stripe, profit, bonus }
}

function ClinicianCard({ name, data, inputs }: { name: string; data: HolidayBonusClinician; inputs: Inputs }) {
  const f = bonusFigures(data, inputs)
  const partialCount = data.periods.filter(p => p.partial).length
  const months = data.windowDays / DAYS_PER_MONTH
  const lines: Array<[string, number]> = [
    ['Session pay', data.sessionPay],
    ['Admin pay', data.adminPay],
    ...(data.bonusPay > 0 ? [['Bonuses already paid', data.bonusPay] as [string, number]] : []),
    ['Employer payroll taxes', data.overheadCosts],
    [`Vendor seats (${months.toFixed(1)} mo)`, f.vendor],
    ...(inputs.deductStripe ? [['Stripe fees', f.stripe] as [string, number]] : []),
  ]

  return (
    <Card padding="none">
      <div className="px-5 py-3 border-b border-border bg-surface-sunken flex items-center justify-between">
        <p className="table-th">{name}</p>
        <p className="text-xs text-muted font-body">
          since {data.windowStart} · {data.sessions} sessions
        </p>
      </div>
      <table className="w-full text-sm font-body">
        <tbody className="divide-y divide-border">
          <tr>
            <td className="px-4 py-2 text-ink">{inputs.basis === 'revenue' ? 'Revenue generated' : 'Payments received'}</td>
            <td className="px-4 py-2 text-right tabular-nums text-ink">{formatCurrency(f.income)}</td>
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
      {partialCount > 0 && (
        <p className="px-4 py-2 text-xs text-muted font-body border-t border-border">
          {partialCount} pay period{partialCount === 1 ? '' : 's'} cut by the date window (or still open) — pay is
          estimated from session counts (no admin hours) and employer taxes at the standard rate.
        </p>
      )}
    </Card>
  )
}

export default function HolidayBonus() {
  const [from, setFrom] = useState('')   // blank = each clinician's start date
  const [to, setTo] = useState('2026-11-30')
  const [pct, setPct] = useState(15)
  const [basis, setBasis] = useState<Basis>('revenue')
  const [vendorPerMonth, setVendorPerMonth] = useState(DEFAULT_VENDOR_PER_MONTH)
  const [deductStripe, setDeductStripe] = useState(false)
  const { data, isLoading, isError, error } = useHolidayBonus(from, to)
  const inputs: Inputs = { pct, basis, vendorPerMonth, deductStripe }

  const total = data
    ? bonusFigures(data.clinicians.Emily, inputs).bonus + bonusFigures(data.clinicians.Shana, inputs).bonus
    : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Holiday Bonus"
        subtitle="Profit generated by Emily and Shana from their start dates, and the bonus at a chosen percentage"
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
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Revenue basis</span>
            <select value={basis} onChange={e => setBasis(e.target.value as Basis)}
              className="border border-border rounded px-2 py-1 bg-white text-ink">
              <option value="revenue">Billed (by service date)</option>
              <option value="cash">Cash received to date</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pb-1">
            <input type="checkbox" checked={deductStripe} onChange={e => setDeductStripe(e.target.checked)} />
            <span className="text-xs text-muted">Also deduct Stripe fees</span>
          </label>
        </div>
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

          <div className="space-y-3">
            <h2 className="font-heading text-base font-semibold text-ink">By pay period</h2>
            <Card padding="none">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="bg-surface-sunken">
                    <th className="table-th px-4 py-2 text-left">Clinician</th>
                    <th className="table-th px-4 py-2 text-left">Period</th>
                    <th className="table-th px-4 py-2 text-right">Sessions</th>
                    <th className="table-th px-4 py-2 text-right">Revenue</th>
                    <th className="table-th px-4 py-2 text-right">Pay</th>
                    <th className="table-th px-4 py-2 text-right">Employer tax</th>
                    <th className="table-th px-4 py-2 text-right">Stripe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(['Emily', 'Shana'] as const).flatMap(n =>
                    data.clinicians[n].periods.map(p => (
                      <tr key={`${n}-${p.periodStart}`}>
                        <td className="px-4 py-2 text-ink">{n}</td>
                        <td className="px-4 py-2 text-muted">
                          {p.periodStart} – {p.periodEnd}{p.partial ? ' *' : ''}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">{p.sessions}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(p.revenue)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(p.totalPay)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(p.overheadCosts)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(p.stripeFeesCost)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
            <p className="text-xs text-muted font-body">* Pay period only partly inside the window, or still open; figures cover the in-window days.</p>
          </div>
        </>
      )}
    </div>
  )
}
