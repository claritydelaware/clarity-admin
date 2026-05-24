import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertCircle, Save } from 'lucide-react'
import { useStaffMember, useUpdateStaff } from '../hooks/useStaff'
import type { StaffMember } from '../types'

function licenseStatus(exp: string | null): 'ok' | 'warning' | 'expired' | null {
  if (!exp) return null
  const days = Math.floor((new Date(exp).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'expired'
  if (days <= 90) return 'warning'
  return 'ok'
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-body font-medium text-muted uppercase tracking-wide mb-1">{label}</dt>
      <dd className="text-sm font-body text-ink">{children}</dd>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', disabled = false }: {
  label: string; value: string | number; onChange: (v: string) => void
  type?: string; disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="text-xs font-body font-medium text-muted uppercase tracking-wide">{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="mt-1 block w-full rounded border border-gray-200 px-3 py-2 text-sm font-body text-ink bg-white focus:outline-none focus:ring-2 focus:ring-teal disabled:bg-gray-50 disabled:text-muted"
      />
    </label>
  )
}

export default function StaffDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: member, isLoading, isError, error } = useStaffMember(id ?? '')
  const { mutate: updateStaff, isPending: isSaving } = useUpdateStaff()

  const [annualSalary, setAnnualSalary] = useState('')
  const [sessionRate, setSessionRate] = useState('')
  const [adminHourlyRate, setAdminHourlyRate] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (member) {
      setAnnualSalary(member.annualSalary != null ? String(member.annualSalary) : '')
      setSessionRate(member.sessionRate != null ? String(member.sessionRate) : '')
      setAdminHourlyRate(member.adminHourlyRate != null ? String(member.adminHourlyRate) : '')
      setNotes(member.notes)
    }
  }, [member])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm font-body">Loading…</span>
      </div>
    )
  }

  if (isError || !member) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-error font-body">
        <AlertCircle size={16} />
        {isError ? (error as Error).message : 'Staff member not found'}
      </div>
    )
  }

  const lStatus = licenseStatus(member.licenseExpiration)

  const handleSave = () => {
    const updates: Partial<StaffMember> = { notes }
    if (member.compensationType === 'salary') {
      updates.annualSalary = parseFloat(annualSalary) || null
    } else {
      updates.sessionRate = parseFloat(sessionRate) || null
      updates.adminHourlyRate = parseFloat(adminHourlyRate) || null
    }
    updateStaff({ id: member.id, data: updates })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back nav */}
      <Link to="/staff" className="inline-flex items-center gap-1.5 text-sm font-body text-muted hover:text-teal transition-colors">
        <ArrowLeft size={15} />
        Back to Staff
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-pale flex items-center justify-center shrink-0">
              <span className="font-heading text-teal font-semibold">{member.name[0]}</span>
            </div>
            <div>
              <h1 className="font-heading text-lg font-semibold text-ink">{member.name}</h1>
              <span className={[
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-body mt-0.5',
                member.role === 'partner' ? 'bg-teal-pale text-teal' : 'bg-gold-tint text-gold-dark',
              ].join(' ')}>
                {member.role === 'partner' ? 'Partner' : 'W-2'}
              </span>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="NPI">{member.npi || '—'}</Field>
            <Field label="Hire Date">
              {member.hireDate ? new Date(member.hireDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </Field>
            <Field label="License Type">{member.licenseType || '—'}</Field>
            <Field label="License Number">{member.licenseNumber || '—'}</Field>
            <Field label="License State">{member.licenseState || '—'}</Field>
            <Field label="License Expiration">
              {member.licenseExpiration ? (
                <span className={
                  lStatus === 'expired' ? 'text-error font-medium' :
                  lStatus === 'warning' ? 'text-amber-600 font-medium' : undefined
                }>
                  {new Date(member.licenseExpiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {lStatus === 'expired' && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-error text-xs">Expired</span>
                  )}
                  {lStatus === 'warning' && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-xs">Expiring soon</span>
                  )}
                </span>
              ) : '—'}
            </Field>
          </dl>
        </div>

        {/* Compensation panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="font-heading text-base font-semibold text-ink">Compensation</h2>

          <p className="text-xs font-body text-muted bg-gold-pale border border-gold/20 rounded px-3 py-2">
            Rates are used in payroll calculations. Changes take effect on the next pay period load.
          </p>

          <div className="space-y-4">
            {member.compensationType === 'salary' ? (
              <Input
                label="Annual Salary ($)"
                value={annualSalary}
                onChange={setAnnualSalary}
                type="number"
              />
            ) : (
              <>
                <Input
                  label="Session Rate ($ per session)"
                  value={sessionRate}
                  onChange={setSessionRate}
                  type="number"
                />
                <Input
                  label="Admin Hourly Rate ($/hr)"
                  value={adminHourlyRate}
                  onChange={setAdminHourlyRate}
                  type="number"
                />
              </>
            )}
            <Input label="Notes" value={notes} onChange={setNotes} />
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal text-white text-sm font-body rounded hover:bg-teal-mid transition-colors disabled:opacity-60"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
