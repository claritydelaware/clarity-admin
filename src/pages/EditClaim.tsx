import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, AlertTriangle, Loader2, AlertCircle } from 'lucide-react'
import { CLINICIANS, KNOWN_PAYERS, SERVICE_CODES, SUBMISSION_METHODS, CLAIM_STATUSES } from '../types'
import type { Claim, ClaimFullEditInput, Clinician } from '../types'
import { useClaim, useFullEditClaim, useCaseloads } from '../hooks/useClaims'
import { formatCurrency, toInputDate } from '../lib/utils'

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
  insurancePaidHHO: string
  paymentDateReceived: string
  notes: string
}

const DISCONTINUED_CODES = ['96127', '96136']
const DISCONTINUED_AFTER = new Date('2026-01-15')
const HHO_PAYERS = ['health options']

function mapClaimToFormValues(claim: Claim): FormValues {
  return {
    claimDate: toInputDate(claim.claimDate),
    clinician: claim.clinician,
    clientId: claim.clientId ?? '',
    insurance: claim.insurance,
    claimId: claim.claimId ?? '',
    serviceCode: claim.serviceCode,
    submissionMethod: claim.submissionMethod,
    status: claim.status,
    clientAmount: claim.clientAmount ? String(claim.clientAmount) : '',
    insuranceAmount: claim.insuranceAmount ? String(claim.insuranceAmount) : '',
    insurancePaidHHO: claim.insurancePaidHHO != null ? String(claim.insurancePaidHHO) : '',
    paymentDateReceived: claim.paymentDateReceived ? toInputDate(claim.paymentDateReceived) : '',
    notes: claim.notes ?? '',
  }
}

export default function EditClaim() {
  const { rowIndex: rowIndexStr } = useParams<{ rowIndex: string }>()
  const rowIndex = parseInt(rowIndexStr ?? '0', 10)
  const navigate = useNavigate()

  const { data: claim, isLoading, isError, error } = useClaim(rowIndex)
  const { mutate, isPending, isError: isMutateError, error: mutateError } = useFullEditClaim()
  const { data: caseloads } = useCaseloads()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      claimDate: '',
      clinician: 'Shannon',
      clientId: '',
      insurance: '',
      claimId: '',
      serviceCode: '90837',
      submissionMethod: 'Electronic',
      status: 'Pending',
      clientAmount: '',
      insuranceAmount: '',
      insurancePaidHHO: '',
      paymentDateReceived: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (claim && !isDirty) reset(mapClaimToFormValues(claim))
  }, [claim])

  const clinician = watch('clinician')
  const claimDate = watch('claimDate')
  const serviceCode = watch('serviceCode')
  const insurance = watch('insurance')
  const clientAmountRaw = watch('clientAmount')
  const insuranceAmountRaw = watch('insuranceAmount')
  const insurancePaidHHORaw = watch('insurancePaidHHO')
  const submissionMethod = watch('submissionMethod')
  const status = watch('status')

  const PAYMENT_DATE_STATUSES = ['Payment Received', 'Payment Pending', 'Deductible'] as const
  const showPaymentDate = PAYMENT_DATE_STATUSES.includes(status as typeof PAYMENT_DATE_STATUSES[number])
  const paymentDateRequired = status === 'Payment Received'

  const clientOptions = caseloads
    ?.filter(e => e.clinician === clinician)
    .map(e => e.clientId) ?? []

  const isDiscontinuedCode = DISCONTINUED_CODES.includes(serviceCode) &&
    claimDate && new Date(claimDate) > DISCONTINUED_AFTER

  const isHHO = HHO_PAYERS.includes((insurance ?? '').toLowerCase())

  const isHHOCash = isHHO &&
    (submissionMethod === 'Cash' || (watch('notes') ?? '').toLowerCase().includes('late cancellation'))

  const clientAmount = parseFloat(clientAmountRaw) || 0
  const stripeFees = clientAmount > 0 ? Math.round((clientAmount * 0.029 + 0.3) * 100) / 100 : 0

  const insurancePaidHHOVal = parseFloat(insurancePaidHHORaw) || 0
  const insuranceAmountVal = parseFloat(insuranceAmountRaw) || 0
  const overUnderHHO = insurancePaidHHOVal - insuranceAmountVal
  const hasHHOAmounts = insurancePaidHHORaw !== '' && insuranceAmountRaw !== ''

  const onSubmit = (values: FormValues) => {
    const isHHOSubmit = HHO_PAYERS.includes((values.insurance ?? '').toLowerCase())
    const data: ClaimFullEditInput = {
      claimDate: values.claimDate,
      clinician: values.clinician as Clinician,
      clientId: values.clientId || undefined,
      insurance: values.insurance,
      claimId: values.claimId || undefined,
      serviceCode: values.serviceCode as ClaimFullEditInput['serviceCode'],
      submissionMethod: values.submissionMethod as ClaimFullEditInput['submissionMethod'],
      status: values.status as ClaimFullEditInput['status'],
      clientAmount: values.clientAmount ? parseFloat(values.clientAmount) : 0,
      insuranceAmount: values.insuranceAmount ? parseFloat(values.insuranceAmount) : 0,
      insurancePaidHHO: isHHOSubmit && values.insurancePaidHHO !== ''
        ? parseFloat(values.insurancePaidHHO)
        : undefined,
      paymentDateReceived: values.paymentDateReceived || undefined,
      notes: values.notes || undefined,
    }
    mutate({ rowIndex, data }, { onSuccess: () => navigate('/claims') })
  }

  const labelClass = 'block text-xs font-medium text-muted font-body mb-1'
  const inputClass = 'w-full h-9 rounded border border-gray-200 px-3 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent'
  const errorClass = 'text-xs text-error mt-1 font-body'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm font-body">Loading claim…</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-error font-body">
        <AlertCircle size={16} className="shrink-0" />
        {(error as Error).message}
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <Link
        to="/claims"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-teal font-body mb-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
      >
        <ArrowLeft size={16} />
        Back to Claims
      </Link>

      <div className="mb-6">
        <h1 className="font-heading text-xl font-semibold text-ink">Edit Claim</h1>
        {claim && (
          <p className="text-xs text-muted font-body mt-1">
            {claim.clinician} · {claim.claimDate}
            {claim.claimId && ` · ${claim.claimId}`}
            {' · '}Row {rowIndex}
          </p>
        )}
      </div>

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
            <select {...register('clinician', { required: 'Required' })} className={inputClass}>
              {CLINICIANS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Client ID */}
        <div>
          <label className={labelClass}>Client ID</label>
          <input
            type="text"
            list="client-options-edit"
            {...register('clientId')}
            className={inputClass}
            placeholder="Start typing or select…"
            autoComplete="off"
          />
          <datalist id="client-options-edit">
            {clientOptions.map(id => <option key={id} value={id} />)}
          </datalist>
          <p className="text-xs text-muted font-body mt-1">Hashed token — never a real name</p>
        </div>

        {/* Row 2: Insurance + Claim ID */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Insurance / Payer *</label>
            <select {...register('insurance', { required: 'Required' })} className={inputClass}>
              <option value="">Select payer…</option>
              {KNOWN_PAYERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {errors.insurance && <p className={errorClass}>{errors.insurance.message}</p>}
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
            <select {...register('serviceCode', { required: 'Required' })} className={inputClass}>
              {SERVICE_CODES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.serviceCode && <p className={errorClass}>{errors.serviceCode.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Submission Method *</label>
            <select {...register('submissionMethod', { required: 'Required' })} className={inputClass}>
              {SUBMISSION_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Status + Payment Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Status</label>
            <select {...register('status')} className={inputClass}>
              {CLAIM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {showPaymentDate && (
            <div>
              <label className={labelClass}>
                Payment Date Received{paymentDateRequired ? ' *' : ''}
              </label>
              <input
                type="date"
                {...register('paymentDateReceived', {
                  required: paymentDateRequired ? 'Required for Payment Received' : false,
                })}
                className={inputClass}
              />
              {errors.paymentDateReceived && (
                <p className={errorClass}>{errors.paymentDateReceived.message}</p>
              )}
            </div>
          )}
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
              className={inputClass}
              placeholder="0.00"
            />
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

        {/* HHO dispute tracking — Health Options only */}
        {isHHO && (
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div>
              <label className={labelClass}>
                Ins. Paid (HHO)
                <span className="ml-1.5 font-normal text-[10px] text-muted normal-case">col P — what HHO actually paid</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('insurancePaidHHO')}
                className={inputClass}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={labelClass}>
                Over/Under (HHO)
                <span className="ml-1.5 font-normal text-[10px] text-muted normal-case">HHO Paid − Insurance Amount</span>
              </label>
              <div className={[
                'flex h-9 items-center px-3 rounded border border-gray-200 bg-gray-50 text-sm font-body tabular-nums select-none',
                hasHHOAmounts && overUnderHHO > 0 ? 'text-green-700 font-medium' :
                hasHHOAmounts && overUnderHHO < 0 ? 'text-error font-medium' : 'text-muted',
              ].join(' ')}>
                {hasHHOAmounts
                  ? (overUnderHHO > 0 ? '+' : '') + formatCurrency(overUnderHHO)
                  : <span className="italic text-xs">enter both amounts</span>}
              </div>
            </div>
          </div>
        )}

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

        {isMutateError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-error font-body">
            <AlertTriangle size={15} className="shrink-0" />
            {(mutateError as Error).message}
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
            {isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
