import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import { useCreateStaff } from '../hooks/useStaff'
import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import ErrorBanner from '../components/ui/ErrorBanner'
import type { StaffMember } from '../types'

interface FormValues {
  name: string
  role: 'partner' | 'w2'
  npi: string
  caqhId: string
  licenseType: string
  licenseNumber: string
  licenseState: string
  licenseExpiration: string
  hireDate: string
  compensationType: 'salary' | 'session-rate'
  annualSalary: string
  therapySessionRate: string
  otherSessionRate: string
  noShowRate: string
  adminHourlyRate: string
  targetCapacity: string
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
      caqhId: '',
    },
  })

  const compensationType = watch('compensationType')

  useEffect(() => {
    if (created) navigate(`/staff/${created.id}`)
  }, [created, navigate])

  const onSubmit = (values: FormValues) => {
    const isSessionRate = values.compensationType === 'session-rate'
    const member: StaffMember = {
      id: crypto.randomUUID(),
      name: values.name,
      role: values.role,
      npi: values.npi,
      caqhId: values.caqhId ?? '',
      licenseType: values.licenseType,
      licenseNumber: values.licenseNumber,
      licenseState: values.licenseState,
      licenseExpiration: values.licenseExpiration || null,
      hireDate: values.hireDate,
      compensationType: values.compensationType,
      annualSalary: values.compensationType === 'salary' && values.annualSalary ? parseFloat(values.annualSalary) : null,
      sessionRate: null,
      therapySessionRate: isSessionRate && values.therapySessionRate ? parseFloat(values.therapySessionRate) : null,
      otherSessionRate:   isSessionRate && values.otherSessionRate   ? parseFloat(values.otherSessionRate)   : null,
      noShowRate:         isSessionRate && values.noShowRate         ? parseFloat(values.noShowRate)         : null,
      adminHourlyRate:    isSessionRate && values.adminHourlyRate    ? parseFloat(values.adminHourlyRate)    : null,
      targetCapacity: values.targetCapacity ? parseFloat(values.targetCapacity) : null,
      active: true,
      notes: values.notes,
    }
    mutate(member)
  }

  const labelClass = 'block text-xs font-medium text-muted font-ui mb-1.5'
  const inputClass = 'w-full h-9 rounded-lg border border-border bg-white px-3 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal transition-colors hover:border-border-strong'
  const errorClass = 'text-xs text-error mt-1 font-ui'

  return (
    <div className="max-w-2xl">
      <Link
        to="/staff"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-teal font-body mb-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
      >
        <ArrowLeft size={16} />
        Back to Staff
      </Link>

      <PageHeader title="Add Staff Member" />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Name *</label>
                <input type="text" {...register('name', { required: 'Required' })} className={inputClass} placeholder="Full name" />
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>NPI</label>
                <input type="text" {...register('npi')} className={inputClass} placeholder="10-digit NPI" />
              </div>
              <div>
                <label className={labelClass}>CAQH ID</label>
                <input type="text" {...register('caqhId')} className={inputClass} placeholder="Optional" />
              </div>
            </div>

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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Hire Date *</label>
                <input type="date" {...register('hireDate', { required: 'Required' })} className={inputClass} />
                {errors.hireDate && <p className={errorClass}>{errors.hireDate.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Compensation Type *</label>
                <select {...register('compensationType')} className={inputClass}>
                  <option value="salary">Salary</option>
                  <option value="session-rate">Session Rate</option>
                </select>
              </div>
            </div>

            {compensationType === 'salary' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Annual Salary ($)</label>
                  <input type="number" step="1" min="0" {...register('annualSalary')} className={inputClass} placeholder="70000" />
                </div>
              </div>
            )}

            {compensationType === 'session-rate' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Therapy Session Rate — 90837 / 90791 ($/session)</label>
                    <input type="number" step="0.01" min="0" {...register('therapySessionRate')} className={inputClass} placeholder="50" />
                  </div>
                  <div>
                    <label className={labelClass}>Other Session Rate — 90834 / 90832 / 90847 / 90846 ($/session)</label>
                    <input type="number" step="0.01" min="0" {...register('otherSessionRate')} className={inputClass} placeholder="40" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>No-Show / Late Cancel Rate ($/occurrence)</label>
                    <input type="number" step="0.01" min="0" {...register('noShowRate')} className={inputClass} placeholder="40" />
                  </div>
                  <div>
                    <label className={labelClass}>Admin Hourly Rate ($/hr)</label>
                    <input type="number" step="0.01" min="0" {...register('adminHourlyRate')} className={inputClass} placeholder="25" />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className={labelClass}>Weekly Session Target (for utilization %)</label>
              <input type="number" step="1" min="1" {...register('targetCapacity')} className={inputClass} placeholder="25" />
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <input type="text" {...register('notes')} className={inputClass} placeholder="Optional…" />
            </div>

            {isError && <ErrorBanner message={(error as Error).message} />}

            <div className="flex justify-end gap-2 pt-1">
              <Link to="/staff">
                <Button variant="secondary" type="button">Cancel</Button>
              </Link>
              <Button type="submit" loading={isPending}>
                {isPending ? 'Saving…' : 'Save Staff Member'}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  )
}
