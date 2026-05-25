import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react'
import { CLINICIANS, KNOWN_PAYERS, SERVICE_CODES, SUBMISSION_METHODS, CLAIM_STATUSES } from '../types'
import type { NewClaimInput, Clinician } from '../types'
import { useCreateClaim, useCaseloads, useClaims } from '../hooks/useClaims'
import { formatCurrency } from '../lib/utils'

interface FormValues {
  claimDate: string
  clinician: Clinician
  clientId: string
  insurance: string
  claimId: string
  serviceCode: string
  submissionMethod: string
  status: string
  clientAmount: string
  insuranceAmount: string
  notes: string
}

const DISCONTINUED_CODES = ['96127', '96136']
const DISCONTINUED_AFTER = new Date('2026-01-15')
const HHO_PAYERS = ['health options']

function todayInputDate(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function NewClaim() {
  const navigate = useNavigate()
  const { mutate, isPending, isError, error, data: created } = useCreateClaim()
  const { data: caseloads } = useCaseloads()
  const { data: claims } = useClaims()
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set())

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      claimDate: todayInputDate(),
      status: 'Pending',
      submissionMethod: 'Manual',
      serviceCode: '90837',
      clinician: 'Shannon',
    },
  })

  const clinician = watch('clinician')
  const claimDate = watch('claimDate')
  const serviceCode = watch('serviceCode')
  const insurance = watch('insurance')
  const clientAmountRaw = watch('clientAmount')
  const submissionMethod = watch('submissionMethod')
  const clientIdValue = watch('clientId')

  // Derived client IDs for selected clinician
  const clientOptions = caseloads
    ?.filter(e => e.clinician === clinician)
    .map(e => e.clientId) ?? []

  // Business rule warnings
  const isDiscontinuedCode = DISCONTINUED_CODES.includes(serviceCode) &&
    claimDate && new Date(claimDate) > DISCONTINUED_AFTER

  const isHHOCash = HHO_PAYERS.includes((insurance ?? '').toLowerCase()) &&
    (submissionMethod === 'Cash' || (watch('notes') ?? '').toLowerCase().includes('late cancellation'))

  const clientAmount = parseFloat(clientAmountRaw) || 0
  const stripeFees = clientAmount > 0 ? Math.round((clientAmount * 0.029 + 0.3) * 100) / 100 : 0

  // Redirect on success with new row highlighted
  useEffect(() => {
    if (created) navigate('/claims', { state: { newRowIndex: created.rowIndex } })
  }, [created, navigate])

  // Auto-fill from caseloads + most recent claim when clientId changes
  useEffect(() => {
    if (!clientIdValue) {
      setAutoFilledFields(new Set())
      return
    }
    const filled = new Set<string>()

    // Clinician from caseloads (authoritative)
    const caseload = caseloads?.find(e => e.clientId === clientIdValue)
    if (caseload) {
      setValue('clinician', caseload.clinician as Clinician)
      filled.add('clinician')
    }

    // Billing details from most recent claim
    const recent = [...(claims ?? [])]
      .filter(c => c.clientId === clientIdValue)
      .sort((a, b) => new Date(b.claimDate).getTime() - new Date(a.claimDate).getTime())[0]

    if (recent) {
      setValue('insurance', recent.insurance)
      filled.add('insurance')
      setValue('serviceCode', recent.serviceCode as FormValues['serviceCode'])
      filled.add('serviceCode')
      setValue('submissionMethod', recent.submissionMethod)
      filled.add('submissionMethod')
      setValue('clientAmount', String(recent.clientAmount))
      filled.add('clientAmount')
      // Fall back to claim's clinician if caseload had no match
      if (!caseload) {
        setValue('clinician', recent.clinician as Clinician)
        filled.add('clinician')
      }
    }

    setAutoFilledFields(filled)
  }, [clientIdValue, caseloads, claims, setValue])

  const onSubmit = (values: FormValues) => {
    mutate({
      claimDate: values.claimDate,
      clinician: values.clinician as Clinician,
      clientId: values.clientId || undefined,
      insurance: values.insurance,
      claimId: values.claimId || undefined,
      serviceCode: values.serviceCode as NewClaimInput['serviceCode'],
      submissionMethod: values.submissionMethod as NewClaimInput['submissionMethod'],
      status: (values.status || 'Pending') as NewClaimInput['status'],
      clientAmount: values.clientAmount ? parseFloat(values.clientAmount) : 0,
      insuranceAmount: values.insuranceAmount ? parseFloat(values.insuranceAmount) : 0,
      notes: values.notes || undefined,
    })
  }

  const labelClass = 'block text-xs font-medium text-muted font-body mb-1'
  const inputClass = 'w-full h-9 rounded border border-gray-200 px-3 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors'
  const inputAutoClass = (field: string) =>
    autoFilledFields.has(field) ? `${inputClass} bg-blue-50` : inputClass
  const errorClass = 'text-xs text-error mt-1 font-body'
  const autoLabel = (field: string) =>
    autoFilledFields.has(field)
      ? <p className="text-xs text-blue-500 font-body mt-0.5">Auto-filled</p>
      : null

  return (
    <div className="max-w-2xl">
      <Link
        to="/claims"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-teal font-body mb-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
      >
        <ArrowLeft size={16} />
        Back to Claims
      </Link>

      <h1 className="font-heading text-xl font-semibold text-ink mb-6">New Claim</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

        {/* Row 1: Date + Clinician */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Claim Date *</label>
            <input
              type="date"
              {...register('claimDate', { required: 'Required' })}
              className={inputClass}
            />
            {errors.claimDate && <p className={errorClass}>{errors.claimDate.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Clinician *</label>
            <select {...register('clinician', { required: 'Required' })} className={inputAutoClass('clinician')}>
              {CLINICIANS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {autoLabel('clinician')}
          </div>
        </div>

        {/* Client ID */}
        <div>
          <label className={labelClass}>Client ID</label>
          <input
            type="text"
            list="client-options"
            {...register('clientId')}
            className={inputClass}
            placeholder="Start typing or select…"
            autoComplete="off"
          />
          <datalist id="client-options">
            {clientOptions.map(id => <option key={id} value={id} />)}
          </datalist>
          <p className="text-xs text-muted font-body mt-1">Hashed token — never a real name</p>
        </div>

        {/* Row 2: Insurance + Claim ID */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Insurance / Payer *</label>
            <select {...register('insurance', { required: 'Required' })} className={inputAutoClass('insurance')}>
              <option value="">Select payer…</option>
              {KNOWN_PAYERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {errors.insurance && <p className={errorClass}>{errors.insurance.message}</p>}
            {autoLabel('insurance')}
          </div>
          <div>
            <label className={labelClass}>Claim ID</label>
            <input
              type="text"
              {...register('claimId')}
              className={inputClass}
              placeholder="SimplePractice claim ID"
            />
          </div>
        </div>

        {/* Row 3: Service Code + Submission Method */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Service Code *</label>
            <select {...register('serviceCode', { required: 'Required' })} className={inputAutoClass('serviceCode')}>
              {SERVICE_CODES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.serviceCode && <p className={errorClass}>{errors.serviceCode.message}</p>}
            {autoLabel('serviceCode')}
          </div>
          <div>
            <label className={labelClass}>Submission Method *</label>
            <select {...register('submissionMethod', { required: 'Required' })} className={inputAutoClass('submissionMethod')}>
              {SUBMISSION_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {autoLabel('submissionMethod')}
          </div>
        </div>

        {/* Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Status</label>
            <select {...register('status')} className={inputClass}>
              {CLAIM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Row 4: Amounts */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Client Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('clientAmount')}
              className={inputAutoClass('clientAmount')}
              placeholder="0.00"
            />
            {autoLabel('clientAmount')}
            {clientAmount > 0 && (
              <p className="text-xs text-muted font-body mt-1">
                Stripe fee: {formatCurrency(stripeFees)} → Net: {formatCurrency(clientAmount - stripeFees)}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Insurance Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('insuranceAmount')}
              className={inputClass}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full rounded border border-gray-200 px-3 py-2 text-sm font-body text-ink resize-none focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            placeholder="Optional…"
          />
        </div>

        {/* Business rule warnings */}
        {isDiscontinuedCode && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm font-body text-amber-800">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {serviceCode} was discontinued after 1/15/2026. Verify this is intentional.
          </div>
        )}
        {isHHOCash && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm font-body text-amber-800">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            Health Options (Medicaid) clients cannot be charged no-show fees.
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-error font-body">
            <AlertTriangle size={15} className="shrink-0" />
            {(error as Error).message}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Link
            to="/claims"
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
            {isPending ? 'Saving…' : 'Save Claim'}
          </button>
        </div>
      </form>
    </div>
  )
}
