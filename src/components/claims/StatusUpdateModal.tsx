import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { X } from 'lucide-react'
import type { Claim, ClaimStatus } from '../../types'
import { CLAIM_STATUSES } from '../../types'
import { useUpdateClaim } from '../../hooks/useClaims'
import { formatCurrency, formatDate } from '../../lib/utils'

interface Props {
  claim: Claim
  onClose: () => void
}

interface FormValues {
  status: ClaimStatus
  paymentDateReceived: string
  totalPayment: string
  insuranceAmount: string
  notes: string
}

export default function StatusUpdateModal({ claim, onClose }: Props) {
  const { mutate, isPending, isError, error } = useUpdateClaim()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      status: claim.status,
      paymentDateReceived: claim.paymentDateReceived ?? '',
      totalPayment: claim.totalPayment ? String(claim.totalPayment) : '',
      insuranceAmount: claim.insuranceAmount ? String(claim.insuranceAmount) : '',
      notes: claim.notes ?? '',
    },
  })

  const status = watch('status')
  const requiresPayment = status === 'Payment Received'

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const onSubmit = (values: FormValues) => {
    mutate(
      {
        rowIndex: claim.rowIndex,
        data: {
          status: values.status,
          paymentDateReceived: values.paymentDateReceived || undefined,
          totalPayment: values.totalPayment ? parseFloat(values.totalPayment) : undefined,
          insuranceAmount: values.insuranceAmount ? parseFloat(values.insuranceAmount) : undefined,
          notes: values.notes || undefined,
        },
      },
      { onSuccess: onClose },
    )
  }

  const labelClass = 'block text-xs font-medium text-muted font-body mb-1'
  const inputClass = 'w-full h-9 rounded border border-gray-200 px-3 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-heading text-base font-semibold text-ink">Update Status</h2>
            <p className="text-xs text-muted font-body mt-0.5">
              {claim.clinician} · {claim.insurance} · {formatDate(claim.claimDate)} · {claim.serviceCode}
            </p>
            <p className="text-xs text-muted font-body">Current total: {formatCurrency(claim.totalPayment)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-4">
          <div>
            <label className={labelClass}>Status</label>
            <select {...register('status')} className={inputClass}>
              {CLAIM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {requiresPayment && (
            <>
              <div>
                <label className={labelClass}>Payment Date Received *</label>
                <input
                  type="date"
                  {...register('paymentDateReceived', { required: requiresPayment ? 'Required when marking as Payment Received' : false })}
                  className={inputClass}
                />
                {errors.paymentDateReceived && (
                  <p className="text-xs text-error mt-1 font-body">{errors.paymentDateReceived.message}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>Total Payment Received *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('totalPayment', { required: requiresPayment ? 'Required when marking as Payment Received' : false })}
                  className={inputClass}
                  placeholder="0.00"
                />
                {errors.totalPayment && (
                  <p className="text-xs text-error mt-1 font-body">{errors.totalPayment.message}</p>
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
            </>
          )}

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm font-body text-ink resize-none focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              placeholder="Optional notes…"
            />
          </div>

          {isError && (
            <p className="text-xs text-error font-body bg-red-50 rounded px-3 py-2">
              {(error as Error).message}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-body text-muted hover:text-ink rounded border border-gray-200 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-body bg-teal text-white rounded hover:bg-teal-mid transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
