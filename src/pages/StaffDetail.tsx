import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react'
import { useStaffMember, useUpdateStaff, useStaffLicenses, useCreateLicense, useUpdateLicense, useDeleteLicense } from '../hooks/useStaff'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import ErrorBanner from '../components/ui/ErrorBanner'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import type { StaffMember, StaffLicense } from '../types'

function licenseStatus(exp: string | null): 'ok' | 'warning' | 'expired' | null {
  if (!exp) return null
  const days = Math.floor((new Date(exp).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'expired'
  if (days <= 90) return 'warning'
  return 'ok'
}

function LicenseStatusBadge({ exp }: { exp: string | null }) {
  const status = licenseStatus(exp)
  if (!status) return <span className="text-xs text-muted font-body">—</span>
  const cls = status === 'expired'
    ? 'bg-red-50 text-error border-red-200'
    : status === 'warning'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-green-50 text-success border-green-200'
  const label = status === 'expired' ? 'Expired' : status === 'warning' ? 'Expiring soon' : 'Active'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-ui border ${cls}`}>{label}</span>
}

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
    <tr className="border-t border-border">
      <td className="py-2 pr-3 text-sm font-body text-ink">{license.licenseState}</td>
      <td className="py-2 pr-3 text-sm font-body text-ink">{license.licenseType}</td>
      <td className="py-2 pr-3 text-xs text-ink">{license.licenseNumber}</td>
      <td className="py-2 pr-3 text-xs font-body text-muted">{license.effectiveDate ?? '—'}</td>
      <td className="py-2 pr-3 text-xs font-body text-muted">{license.expirationDate ?? '—'}</td>
      <td className="py-2 pr-3"><LicenseStatusBadge exp={license.expirationDate} /></td>
      <td className="py-2 text-right whitespace-nowrap">
        {confirming ? (
          <span className="inline-flex items-center gap-1">
            <span className="text-xs text-error font-ui mr-1">Remove?</span>
            <button onClick={() => { onDelete(); setConfirming(false) }} className="p-1 text-error hover:bg-red-50 rounded">
              <Check size={12} />
            </button>
            <button onClick={() => setConfirming(false)} className="p-1 text-muted hover:bg-surface-sunken rounded">
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
        className="rounded-lg border border-border px-2 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal"
      />
      <input
        placeholder="License #"
        value={form.licenseNumber}
        onChange={e => setForm({ ...form, licenseNumber: e.target.value })}
        className="rounded-lg border border-border px-2 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal"
      />
      <input
        placeholder="State"
        maxLength={2}
        value={form.licenseState}
        onChange={e => setForm({ ...form, licenseState: e.target.value.toUpperCase() })}
        className="rounded-lg border border-border px-2 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal"
      />
      <input
        type="date"
        title="Effective date"
        value={form.effectiveDate}
        onChange={e => setForm({ ...form, effectiveDate: e.target.value })}
        className="rounded-lg border border-border px-2 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal"
      />
      <input
        type="date"
        title="Expiration date"
        value={form.expirationDate}
        onChange={e => setForm({ ...form, expirationDate: e.target.value })}
        className="rounded-lg border border-border px-2 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal"
      />
    </div>
  )

  return (
    <Card
      title="Licenses"
      actions={!showAdd ? (
        <Button variant="ghost" size="sm" icon={<Plus size={13} />} onClick={() => setShowAdd(true)}>
          Add License
        </Button>
      ) : undefined}
    >
      {isLoading && (
        <div className="flex items-center gap-2 text-muted text-sm font-body">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      )}

      {showAdd && (
        <div className="space-y-2 p-3 bg-teal-pale/40 rounded-lg border border-teal/20 mb-4">
          <p className="text-xs font-ui text-muted uppercase tracking-wide">New License</p>
          {licenseFormFields(addForm, setAddForm)}
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" loading={isCreating} disabled={!addForm.licenseType || !addForm.licenseNumber} onClick={handleAdd}>
              Save
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { setShowAdd(false); setAddForm(emptyLicenseForm()) }}>
              Cancel
            </Button>
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
                  <th key={h} className="text-left text-xs font-ui font-medium text-muted uppercase tracking-wide pb-2 pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {licenses.map(l => editingId === l.id ? (
                <tr key={l.id} className="border-t border-border">
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
                      <button onClick={() => setEditingId(null)} className="p-1 text-muted hover:bg-surface-sunken rounded">
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
    </Card>
  )
}

export default function StaffDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: member, isLoading, isError, error } = useStaffMember(id ?? '')
  const { mutate: updateStaff, isPending: isSaving } = useUpdateStaff()

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

  if (isLoading) return <LoadingSpinner label="Loading…" />

  if (isError || !member) {
    return <ErrorBanner message={isError ? (error as Error).message : 'Staff member not found'} />
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
      <Link to="/staff" className="inline-flex items-center gap-1.5 text-sm font-body text-muted hover:text-teal transition-colors">
        <ArrowLeft size={15} />
        Back to Staff
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile panel */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Avatar name={name || '?'} size="lg" />
            <h1 className="font-heading text-lg font-semibold text-ink">{member.name}</h1>
          </div>

          {lStatus === 'expired' && (
            <ErrorBanner message="Primary license expired" className="mb-4" />
          )}
          {lStatus === 'warning' && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 font-body mb-4">
              Primary license expiring soon
            </div>
          )}

          <div className="space-y-3">
            <Input label="Name" value={name} onChange={e => setName(e.target.value)} />
            <Select
              label="Role"
              value={role}
              onChange={e => setRole(e.target.value as 'partner' | 'w2')}
              options={[{ value: 'partner', label: 'Partner' }, { value: 'w2', label: 'W-2' }]}
            />
            <Input label="NPI" value={npi} onChange={e => setNpi(e.target.value)} />
            <Input label="CAQH ID" value={caqhId} onChange={e => setCaqhId(e.target.value)} />

            <div className="pt-1">
              <p className="text-xs font-ui font-medium text-muted uppercase tracking-wide mb-2">Primary License</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Type" value={licenseType} onChange={e => setLicenseType(e.target.value)} />
                <Input label="Number" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Input label="State" value={licenseState} onChange={e => setLicenseState(e.target.value)} />
                <Input label="Expiration" value={licenseExpiration} onChange={e => setLicenseExpiration(e.target.value)} type="date" />
              </div>
              <p className="text-xs font-body text-muted mt-1.5 italic">Additional licenses are managed in the Licenses section below.</p>
            </div>

            <Input label="Hire Date" value={hireDate} onChange={e => setHireDate(e.target.value)} type="date" />

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
              <span className="text-xs font-ui font-medium text-muted uppercase tracking-wide">Active</span>
            </label>
          </div>
        </Card>

        {/* Compensation panel */}
        <Card title="Compensation">
          <p className="text-xs font-body text-muted bg-gold-pale border border-gold/20 rounded-lg px-3 py-2 mb-4">
            Rates are used in payroll calculations. Changes take effect on the next pay period load.
          </p>

          <div className="space-y-4">
            {member.compensationType === 'salary' ? (
              <Input
                label="Annual Salary ($)"
                value={annualSalary}
                onChange={e => setAnnualSalary(e.target.value)}
                type="number"
              />
            ) : (
              <>
                <Input label="Therapy Session Rate — 90837 / 90791 ($/session)" value={therapySessionRate} onChange={e => setTherapySessionRate(e.target.value)} type="number" />
                <Input label="Other Session Rate — 90834 / 90832 / 90847 / 90846 ($/session)" value={otherSessionRate} onChange={e => setOtherSessionRate(e.target.value)} type="number" />
                <Input label="No-Show / Late Cancel Rate ($/occurrence)" value={noShowRate} onChange={e => setNoShowRate(e.target.value)} type="number" />
                <Input label="Admin Hourly Rate ($/hr)" value={adminHourlyRate} onChange={e => setAdminHourlyRate(e.target.value)} type="number" />
              </>
            )}
            <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </Card>
      </div>

      <Button icon={<Save size={14} />} loading={isSaving} onClick={handleSave}>
        Save Changes
      </Button>

      <LicensesSection staffId={member.id} />
    </div>
  )
}
