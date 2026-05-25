import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useCreateStaff } from '../hooks/useStaff'
import type { StaffMember } from '../types'

interface FormValues {
  name: string
  role: 'partner' | 'w2'
  npi: string
  licenseType: string
  licenseNumber: string
  licenseState: string
  licenseExpiration: string
  hireDate: string
  compensationType: 'salary' | 'session-rate'
  annualSalary: string
  sessionRate: string
  adminHourlyRate: string
  notes: string
}

export default function NewStaff() {
  const navigate = useNavigate()
  const { mutate, isPending, isError, error, data: created } = useCreateStaff()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      role: 'partner',
      licenseState: 'DE',
      compensationType: 'salary',
    },
  })

  const compensationType = watch('compensationType')

  useEffect(() => {
    if (created) navigate(`/staff/${created.id}`)
  }, [created, navigate])

  const onSubmit = (values: FormValues) => {
    const member: StaffMember = {
      id: crypto.randomUUID(),
      name: values.name,
      role: values.role,
      npi: values.npi,
      licenseType: values.licenseType,
      licenseNumber: values.licenseNumber,
      licenseState: values.licenseState,
      licenseExpiration: values.licenseExpiration || null,
      hireDate: values.hireDate,
      compensationType: values.compensationType,
      annualSalary: values.compensationType === 'salary' && values.annualSalary ? parseFloat(values.annualSalary) : null,
      sessionRate: values.compensationType === 'session-rate' && values.sessionRate ? parseFloat(values.sessionRate) : null,
      adminHourlyRate: values.compensationType === 'session-rate' && values.adminHourlyRate ? parseFloat(values.adminHourlyRate) : null,
      active: true,
      notes: values.notes,
    }
    mutate(member)
  }

  const labelClass = 'block text-xs font-medium text-muted font-body mb-1'
  const inputClass = 'w-full h-9 rounded border border-gray-200 px-3 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent'
  const errorClass = 'text-xs text-error mt-1 font-body'

  return (
    <div className="max-w-2xl">
      <Link
        to="/staff"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-teal font-body mb-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
      >
        <ArrowLeft size={16} />
        Back to Staff
      </Link>

      <h1 className="font-heading text-xl font-semibold text-ink mb-6">Add Staff Member</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

        {/* Name + Role */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Name *</label>
            <input
              type="text"
              {...register('name', { required: 'Required' })}
              className={inputClass}
              placeholder="Full name"
            />
            {errors.name && <p className={errorClass}>{errors.name.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Role *</label>
            <select {...register('role', { required: 'Required' })} className={inputClass}>
              <option value="partner">Partner</option>
              <option value="w2">W-2</option>
            </select>
          </div>
        </div>

        {/* NPI */}
        <div>
          <label className={labelClass}>NPI</label>
          <input type="text" {...register('npi')} className={inputClass} placeholder="10-digit NPI" />
        </div>

        {/* License fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>License Type</label>
            <input type="text" {...register('licenseType')} className={inputClass} placeholder="e.g. LPCMH, LCSW" />
          </div>
          <div>
            <label className={labelClass}>License Number</label>
            <input type="text" {...register('licenseNumber')} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>License State</label>
            <input type="text" {...register('licenseState')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>License Expiration</label>
            <input type="date" {...register('licenseExpiration')} className={inputClass} />
          </div>
        </div>

        {/* Hire Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Hire Date *</label>
            <input
              type="date"
              {...register('hireDate', { required: 'Required' })}
              className={inputClass}
            />
            {errors.hireDate && <p className={errorClass}>{errors.hireDate.message}</p>}
          </div>
        </div>

        {/* Compensation Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Compensation Type *</label>
            <select {...register('compensationType')} className={inputClass}>
              <option value="salary">Salary</option>
              <option value="session-rate">Session Rate</option>
            </select>
          </div>
        </div>

        {/* Conditional compensation fields */}
        {compensationType === 'salary' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Annual Salary ($)</label>
              <input type="number" step="1" min="0" {...register('annualSalary')} className={inputClass} placeholder="70000" />
            </div>
          </div>
        )}

        {compensationType === 'session-rate' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Session Rate ($/session)</label>
              <input type="number" step="0.01" min="0" {...register('sessionRate')} className={inputClass} placeholder="75" />
            </div>
            <div>
              <label className={labelClass}>Admin Hourly Rate ($/hr)</label>
              <input type="number" step="0.01" min="0" {...register('adminHourlyRate')} className={inputClass} placeholder="25" />
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className={labelClass}>Notes</label>
          <input type="text" {...register('notes')} className={inputClass} placeholder="Optional…" />
        </div>

        {isError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-error font-body">
            {(error as Error).message}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Link
            to="/staff"
            className="px-4 py-2 text-sm font-body text-muted hover:text-ink rounded border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-body bg-teal text-white rounded hover:bg-teal-mid transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {isPending ? 'Saving…' : 'Save Staff Member'}
          </button>
        </div>
      </form>
    </div>
  )
}
