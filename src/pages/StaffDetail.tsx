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

function SelectField({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="block">
      <span className="text-xs font-body font-medium text-muted uppercase tracking-wide">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 block w-full rounded border border-gray-200 px-3 py-2 text-sm font-body text-ink bg-white focus:outline-none focus:ring-2 focus:ring-teal"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

export default function StaffDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: member, isLoading, isError, error } = useStaffMember(id ?? '')
  const { mutate: updateStaff, isPending: isSaving } = useUpdateStaff()

  // Profile fields
  const [name, setName] = useState('')
  const [role, setRole] = useState<'partner' | 'w2'>('partner')
  const [npi, setNpi] = useState('')
  const [licenseType, setLicenseType] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseState, setLicenseState] = useState('')
  const [licenseExpiration, setLicenseExpiration] = useState('')
  const [hireDate, setHireDate] = useState('')
  const [active, setActive] = useState(true)

  // Compensation fields
  const [annualSalary, setAnnualSalary] = useState('')
  const [sessionRate, setSessionRate] = useState('')
  const [adminHourlyRate, setAdminHourlyRate] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (member) {
      setName(member.name)
      setRole(member.role)
      setNpi(member.npi)
      setLicenseType(member.licenseType)
      setLicenseNumber(member.licenseNumber)
      setLicenseState(member.licenseState)
      setLicenseExpiration(member.licenseExpiration ?? '')
      setHireDate(member.hireDate)
      setActive(member.active)
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
    const updates: Partial<StaffMember> = {
      name,
      role,
      npi,
      licenseType,
      licenseNumber,
      licenseState,
      licenseExpiration: licenseExpiration || null,
      hireDate,
      active,
      notes,
    }
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
              <span className="font-heading text-teal font-semibold">{name[0] ?? '?'}</span>
            </div>
            <h1 className="font-heading text-lg font-semibold text-ink">{member.name}</h1>
          </div>

          {lStatus === 'expired' && (
            <div className="flex items-center gap-2 rounded bg-red-50 border border-red-200 px-3 py-2 text-xs text-error font-body">
              <AlertCircle size={13} />
              License expired
            </div>
          )}
          {lStatus === 'warning' && (
            <div className="flex items-center gap-2 rounded bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 font-body">
              <AlertCircle size={13} />
              License expiring soon
            </div>
          )}

          <div className="space-y-3">
            <Input label="Name" value={name} onChange={setName} />
            <SelectField
              label="Role"
              value={role}
              onChange={v => setRole(v as 'partner' | 'w2')}
              options={[{ value: 'partner', label: 'Partner' }, { value: 'w2', label: 'W-2' }]}
            />
            <Input label="NPI" value={npi} onChange={setNpi} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="License Type" value={licenseType} onChange={setLicenseType} />
              <Input label="License Number" value={licenseNumber} onChange={setLicenseNumber} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="License State" value={licenseState} onChange={setLicenseState} />
              <Input label="License Expiration" value={licenseExpiration} onChange={setLicenseExpiration} type="date" />
            </div>
            <Input label="Hire Date" value={hireDate} onChange={setHireDate} type="date" />

            {/* Active toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={e => setActive(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-9 h-5 rounded-full transition-colors ${active ? 'bg-teal' : 'bg-gray-300'}`} />
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-xs font-body font-medium text-muted uppercase tracking-wide">Active</span>
            </label>
          </div>
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
        </div>
      </div>

      {/* Single save button covering both panels */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="inline-flex items-center gap-2 px-4 py-2 bg-teal text-white text-sm font-body rounded hover:bg-teal-mid transition-colors disabled:opacity-60"
      >
        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Save Changes
      </button>
    </div>
  )
}
