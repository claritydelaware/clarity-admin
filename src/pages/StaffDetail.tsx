import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertCircle, Save, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { useStaffMember, useUpdateStaff, useStaffLicenses, useCreateLicense, useUpdateLicense, useDeleteLicense } from '../hooks/useStaff'
import type { StaffMember, StaffLicense } from '../types'

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

// ─── LICENSE STATUS BADGE ─────────────────────────────────────────────────────

function LicenseStatusBadge({ exp }: { exp: string | null }) {
  const status = licenseStatus(exp)
  if (!status) return <span className="text-xs text-muted font-body">—</span>
  const cls = status === 'expired'
    ? 'bg-red-50 text-error border-red-200'
    : status === 'warning'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-green-50 text-success border-green-200'
  const label = status === 'expired' ? 'Expired' : status === 'warning' ? 'Expiring soon' : 'Active'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-body border ${cls}`}>{label}</span>
}

// ─── LICENSE ROW ──────────────────────────────────────────────────────────────

interface LicenseFormState {
  licenseType: string
  licenseNumber: string
  licenseState: string
  effectiveDate: string
  expirationDate: string
}

const emptyLicenseForm = (): LicenseFormState => ({
  licenseType: '', licenseNumber: '', licenseState: 'DE', effectiveDate: '', expirationDate: '',
})

function LicenseRow({
  license, onEdit, onDelete,
}: {
  license: StaffLicense; onEdit: () => void; onDelete: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  return (
    <tr className="border-t border-gray-100">
      <td className="py-2 pr-3 text-sm font-body text-ink">{license.licenseState}</td>
      <td className="py-2 pr-3 text-sm font-body text-ink">{license.licenseType}</td>
      <td className="py-2 pr-3 font-mono text-xs text-ink">{license.licenseNumber}</td>
      <td className="py-2 pr-3 text-xs font-body text-muted">{license.effectiveDate ?? '—'}</td>
      <td className="py-2 pr-3 text-xs font-body text-muted">{license.expirationDate ?? '—'}</td>
      <td className="py-2 pr-3"><LicenseStatusBadge exp={license.expirationDate} /></td>
      <td className="py-2 text-right whitespace-nowrap">
        {confirming ? (
          <span className="inline-flex items-center gap-1">
            <span className="text-xs text-error font-body mr-1">Remove?</span>
            <button onClick={() => { onDelete(); setConfirming(false) }} className="p-1 text-error hover:bg-red-50 rounded">
              <Check size={12} />
            </button>
            <button onClick={() => setConfirming(false)} className="p-1 text-muted hover:bg-gray-50 rounded">
              <X size={12} />
            </button>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <button onClick={onEdit} className="p-1 text-muted hover:text-teal hover:bg-teal-pale rounded transition-colors">
              <Pencil size={13} />
            </button>
            <button onClick={() => setConfirming(true)} className="p-1 text-muted hover:text-error hover:bg-red-50 rounded transition-colors">
              <Trash2 size={13} />
            </button>
          </span>
        )}
      </td>
    </tr>
  )
}

// ─── LICENSES SECTION ─────────────────────────────────────────────────────────

function LicensesSection({ staffId }: { staffId: string }) {
  const { data: licenses, isLoading } = useStaffLicenses(staffId)
  const { mutate: createLicense, isPending: isCreating } = useCreateLicense(staffId)
  const { mutate: updateLicense, isPending: isUpdating } = useUpdateLicense(staffId)
  const { mutate: deleteLicense } = useDeleteLicense(staffId)

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<LicenseFormState>(emptyLicenseForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<LicenseFormState>(emptyLicenseForm())

  const startEdit = (l: StaffLicense) => {
    setEditingId(l.id)
    setEditForm({
      licenseType: l.licenseType,
      licenseNumber: l.licenseNumber,
      licenseState: l.licenseState,
      effectiveDate: l.effectiveDate ?? '',
      expirationDate: l.expirationDate ?? '',
    })
  }

  const handleAdd = () => {
    createLicense({
      licenseType: addForm.licenseType,
      licenseNumber: addForm.licenseNumber,
      licenseState: addForm.licenseState,
      effectiveDate: addForm.effectiveDate || null,
      expirationDate: addForm.expirationDate || null,
      active: true,
    }, {
      onSuccess: () => { setShowAdd(false); setAddForm(emptyLicenseForm()) },
    })
  }

  const handleUpdate = (licenseId: string) => {
    updateLicense({
      licenseId,
      data: {
        licenseType: editForm.licenseType,
        licenseNumber: editForm.licenseNumber,
        licenseState: editForm.licenseState,
        effectiveDate: editForm.effectiveDate || null,
        expirationDate: editForm.expirationDate || null,
      },
    }, { onSuccess: () => setEditingId(null) })
  }

  const licenseFormFields = (form: LicenseFormState, setForm: (f: LicenseFormState) => void) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <input
        placeholder="Type (e.g. LPCMH)"
        value={form.licenseType}
        onChange={e => setForm({ ...form, licenseType: e.target.value })}
        className="rounded border border-gray-200 px-2 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal"
      />
      <input
        placeholder="License #"
        value={form.licenseNumber}
        onChange={e => setForm({ ...form, licenseNumber: e.target.value })}
        className="rounded border border-gray-200 px-2 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal"
      />
      <input
        placeholder="State"
        maxLength={2}
        value={form.licenseState}
        onChange={e => setForm({ ...form, licenseState: e.target.value.toUpperCase() })}
        className="rounded border border-gray-200 px-2 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal"
      />
      <input
        type="date"
        title="Effective date"
        value={form.effectiveDate}
        onChange={e => setForm({ ...form, effectiveDate: e.target.value })}
        className="rounded border border-gray-200 px-2 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal"
      />
      <input
        type="date"
        title="Expiration date"
        value={form.expirationDate}
        onChange={e => setForm({ ...form, expirationDate: e.target.value })}
        className="rounded border border-gray-200 px-2 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal"
      />
    </div>
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold text-ink">Licenses</h2>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 text-xs font-body text-teal hover:text-teal-mid transition-colors"
          >
            <Plus size={13} /> Add License
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted text-sm font-body">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      )}

      {showAdd && (
        <div className="space-y-2 p-3 bg-teal-pale/40 rounded-lg border border-teal/20">
          <p className="text-xs font-body text-muted uppercase tracking-wide">New License</p>
          {licenseFormFields(addForm, setAddForm)}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={isCreating || !addForm.licenseType || !addForm.licenseNumber}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal text-white text-xs font-body rounded hover:bg-teal-mid transition-colors disabled:opacity-60"
            >
              {isCreating ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Save
            </button>
            <button
              onClick={() => { setShowAdd(false); setAddForm(emptyLicenseForm()) }}
              className="px-3 py-1.5 text-xs font-body text-muted hover:text-ink border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {licenses && licenses.length === 0 && !showAdd && (
        <p className="text-sm font-body text-muted italic">No additional licenses on file. Click "+ Add License" to add one.</p>
      )}

      {licenses && licenses.length > 0 && (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full min-w-135 px-2">
            <thead>
              <tr>
                {['State', 'Type', 'Number', 'Effective', 'Expires', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-xs font-body font-medium text-muted uppercase tracking-wide pb-2 pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {licenses.map(l => editingId === l.id ? (
                <tr key={l.id} className="border-t border-gray-100">
                  <td colSpan={6} className="py-2 pr-3">
                    {licenseFormFields(editForm, setEditForm)}
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleUpdate(l.id)}
                        disabled={isUpdating}
                        className="p-1 text-teal hover:bg-teal-pale rounded transition-colors disabled:opacity-60"
                      >
                        {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-muted hover:bg-gray-50 rounded">
                        <X size={12} />
                      </button>
                    </span>
                  </td>
                </tr>
              ) : (
                <LicenseRow
                  key={l.id}
                  license={l}
                  onEdit={() => startEdit(l)}
                  onDelete={() => deleteLicense(l.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function StaffDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: member, isLoading, isError, error } = useStaffMember(id ?? '')
  const { mutate: updateStaff, isPending: isSaving } = useUpdateStaff()

  // Profile fields
  const [name, setName] = useState('')
  const [role, setRole] = useState<'partner' | 'w2'>('partner')
  const [npi, setNpi] = useState('')
  const [caqhId, setCaqhId] = useState('')
  const [licenseType, setLicenseType] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseState, setLicenseState] = useState('')
  const [licenseExpiration, setLicenseExpiration] = useState('')
  const [hireDate, setHireDate] = useState('')
  const [active, setActive] = useState(true)

  // Compensation fields
  const [annualSalary, setAnnualSalary] = useState('')
  const [therapySessionRate, setTherapySessionRate] = useState('')
  const [otherSessionRate, setOtherSessionRate] = useState('')
  const [noShowRate, setNoShowRate] = useState('')
  const [adminHourlyRate, setAdminHourlyRate] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (member) {
      setName(member.name)
      setRole(member.role)
      setNpi(member.npi)
      setCaqhId(member.caqhId ?? '')
      setLicenseType(member.licenseType)
      setLicenseNumber(member.licenseNumber)
      setLicenseState(member.licenseState)
      setLicenseExpiration(member.licenseExpiration ?? '')
      setHireDate(member.hireDate)
      setActive(member.active)
      setAnnualSalary(member.annualSalary != null ? String(member.annualSalary) : '')
      setTherapySessionRate(member.therapySessionRate != null ? String(member.therapySessionRate) : '')
      setOtherSessionRate(member.otherSessionRate != null ? String(member.otherSessionRate) : '')
      setNoShowRate(member.noShowRate != null ? String(member.noShowRate) : '')
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
      name, role, npi, caqhId,
      licenseType, licenseNumber, licenseState,
      licenseExpiration: licenseExpiration || null,
      hireDate, active, notes,
    }
    if (member.compensationType === 'salary') {
      updates.annualSalary = parseFloat(annualSalary) || null
    } else {
      updates.therapySessionRate = parseFloat(therapySessionRate) || null
      updates.otherSessionRate   = parseFloat(otherSessionRate) || null
      updates.noShowRate         = parseFloat(noShowRate) || null
      updates.adminHourlyRate    = parseFloat(adminHourlyRate) || null
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
              Primary license expired
            </div>
          )}
          {lStatus === 'warning' && (
            <div className="flex items-center gap-2 rounded bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 font-body">
              <AlertCircle size={13} />
              Primary license expiring soon
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
            <Input label="CAQH ID" value={caqhId} onChange={setCaqhId} />

            <div className="pt-1">
              <p className="text-xs font-body font-medium text-muted uppercase tracking-wide mb-2">Primary License</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Type" value={licenseType} onChange={setLicenseType} />
                <Input label="Number" value={licenseNumber} onChange={setLicenseNumber} />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Input label="State" value={licenseState} onChange={setLicenseState} />
                <Input label="Expiration" value={licenseExpiration} onChange={setLicenseExpiration} type="date" />
              </div>
              <p className="text-xs font-body text-muted mt-1.5 italic">Additional licenses are managed in the Licenses section below.</p>
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
                  label="Therapy Session Rate — 90837 / 90791 ($/session)"
                  value={therapySessionRate}
                  onChange={setTherapySessionRate}
                  type="number"
                />
                <Input
                  label="Other Session Rate — 90834 / 90832 / 90847 / 90846 ($/session)"
                  value={otherSessionRate}
                  onChange={setOtherSessionRate}
                  type="number"
                />
                <Input
                  label="No-Show / Late Cancel Rate ($/occurrence)"
                  value={noShowRate}
                  onChange={setNoShowRate}
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

      {/* Licenses section — saved individually, independent of main save */}
      <LicensesSection staffId={member.id} />
    </div>
  )
}
