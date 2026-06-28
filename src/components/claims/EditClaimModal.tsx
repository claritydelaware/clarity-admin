import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { CLINICIANS, KNOWN_PAYERS, SERVICE_CODES, SUBMISSION_METHODS, CLAIM_STATUSES } from '../../types'
import type { Claim, ClaimFullEditInput, Clinician } from '../../types'
import { useFullEditClaim, useCaseloads } from '../../hooks/useClaims'
import { formatCurrency, toInputDate } from '../../lib/utils'
import Dialog from '../ui/Dialog'
import Button from '../ui/Button'
import ErrorBanner from '../ui/ErrorBanner'
import DeleteClaimModal from './DeleteClaimModal'

interface Props {
  claim: Claim
  onClose: () => void
}

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

export default function EditClaimModal({ claim, onClose }: Props) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const { mutate, isPending, isError: isMutateError, error: mutateError } = useFullEditClaim()
  const { data: caseloads } = useCaseloads()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: mapClaimToFormValues(claim),
  })

  useEffect(() => {
    reset(mapClaimToFormValues(claim))
  }, [claim.rowIndex])

  const clinician = watch('clinician')
  const claimDate = watch('claimDate')
  const serviceCode = watch('serviceCode')
  const insurance = watch('insurance')
  const clientAmountRaw = watch('clientAmount')
  const insuranceAmountRaw = watch('insuranceAmount')
  const insurancePaidHHORaw = watch('insurancePaidHHO')
  const submissionMethod = watch('submissionMethod')
  const status = watch('status')
  const notes = watch('notes') ?? ''

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
    (submissionMethod === 'Cash' || notes.toLowerCase().includes('late cancellation'))

  const clientAmount = parseFloat(clientAmountRaw) || 0
  const stripeFees = clientAmount > 0 ? Math.round((clientAmount * 0.029 + 0.3) * 100) / 100 : 0

  const hasCollectionNote = notes.toLowerCase().includes('copay received') || notes.toLowerCase().includes('coinsurance received')

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
    mutate({ rowIndex: claim.rowIndex, data }, { onSuccess: () => onClose() })
  }

  const labelClass = 'block text-xs font-medium text-muted font-ui mb-1.5'
  const inputClass = 'w-full h-9 rounded-lg border border-border bg-white px-3 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal transition-colors hover:border-border-strong'
  const errorClass = 'text-xs text-error mt-1 font-ui'

  return (
    <>
      <Dialog open onClose={onClose} title={`Edit Claim · ${claim.clinician} · ${claim.claimDate}${claim.claimId ? ` · ${claim.claimId}` : ''}`} maxWidth="2xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Claim Date *</label>
                <input type="date" {...register('claimDate', { required: 'Required' })} className={inputClass} />
                {errors.claimDate && <p className={errorClass}>{errors.claimDate.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Clinician *</label>
                <select {...register('clinician', { required: 'Required' })} className={inputClass}>
                  {CLINICIANS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

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
              <p className="text-xs text-muted font-ui mt-1">Hashed token — never a real name</p>
            </div>

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
                <input type="text" {...register('claimId')} className={inputClass} placeholder="SimplePractice claim ID" />
              </div>
            </div>

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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Client Amount</label>
                <input type="number" step="0.01" min="0" {...register('clientAmount')} className={inputClass} placeholder="0.00" />
                {clientAmount > 0 && (
                  <p className="text-xs text-muted font-ui mt-1">
                    Stripe fee: {formatCurrency(stripeFees)} → Net: {formatCurrency(clientAmount - stripeFees)}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Insurance Amount</label>
                <input type="number" step="0.01" min="0" {...register('insuranceAmount')} className={inputClass} placeholder="0.00" />
              </div>
            </div>

            {isHHO && (
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div>
                  <label className={labelClass}>
                    Ins. Paid (HHO)
                    <span className="ml-1.5 font-normal text-[10px] text-muted normal-case">col P — what HHO actually paid</span>
                  </label>
                  <input type="number" step="0.01" min="0" {...register('insurancePaidHHO')} className={inputClass} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelClass}>
                    Over/Under (HHO)
                    <span className="ml-1.5 font-normal text-[10px] text-muted normal-case">HHO Paid − Insurance Amount</span>
                  </label>
                  <div className={[
                    'flex h-9 items-center px-3 rounded-lg border border-border bg-surface-sunken text-sm font-body tabular-nums select-none',
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

            <div>
              <label className={labelClass}>Notes</label>
              <div className="flex items-center gap-4 mb-2">
                {(['Copay received', 'Coinsurance received'] as const).map(label => {
                  const isChecked = notes.includes(label)
                  return (
                    <label key={label} className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const other = label === 'Copay received' ? 'Coinsurance received' : 'Copay received'
                          let updated = notes
                          if (isChecked) {
                            updated = updated.replace(label, '').replace(/^[,;\s]+|[,;\s]+$/g, '').replace(/\s{2,}/g, ' ')
                          } else {
                            updated = updated.replace(other, '').replace(/^[,;\s]+|[,;\s]+$/g, '').replace(/\s{2,}/g, ' ')
                            updated = updated ? `${label}; ${updated}` : label
                          }
                          setValue('notes', updated)
                        }}
                        className="rounded border-gray-300 text-teal focus:ring-teal cursor-pointer"
                      />
                      <span className="text-xs font-ui text-muted">{label}</span>
                    </label>
                  )
                })}
              </div>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-body text-ink resize-none focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal transition-colors hover:border-border-strong"
                placeholder="Optional…"
              />
            </div>

            {isDiscontinuedCode && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm font-body text-amber-800">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                {serviceCode} was discontinued after 1/15/2026. Verify this is intentional.
              </div>
            )}
            {isHHOCash && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm font-body text-amber-800">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                Health Options (Medicaid) clients cannot be charged no-show fees.
              </div>
            )}
            {clientAmount > 0 && status !== 'Deductible' && !['self-pay', 'late cancellation'].includes((insurance ?? '').toLowerCase()) && !hasCollectionNote && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm font-body text-amber-800">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                Client amount of {formatCurrency(clientAmount)} entered without copay/coinsurance collection noted. This claim will be flagged as outstanding.
              </div>
            )}

            {isMutateError && <ErrorBanner message={(mutateError as Error).message} />}

            <div className="flex items-center justify-between pt-1">
              <Button
                variant="ghost"
                type="button"
                size="sm"
                icon={<Trash2 size={14} />}
                className="text-muted hover:text-error hover:bg-red-50"
                onClick={() => setShowDeleteModal(true)}
              >
                Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
                <Button type="submit" loading={isPending}>
                  {isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Dialog>

      {showDeleteModal && (
        <DeleteClaimModal
          claim={claim}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => { setShowDeleteModal(false); onClose() }}
        />
      )}
    </>
  )
}
