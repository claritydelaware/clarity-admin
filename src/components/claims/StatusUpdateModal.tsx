import { useForm } from 'react-hook-form'
import type { Claim, ClaimStatus } from '../../types'
import { CLAIM_STATUSES } from '../../types'
import { useUpdateClaim } from '../../hooks/useClaims'
import { formatCurrency, formatDate } from '../../lib/utils'
import Dialog from '../ui/Dialog'
import Button from '../ui/Button'

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

  const inputClass = 'w-full h-9 rounded-lg border border-border bg-white px-3 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal'
  const labelClass = 'block text-xs font-medium text-muted font-ui mb-1.5'

  return (
    <Dialog open onClose={onClose} title="Update Status">
      <div className="mb-3">
        <p className="text-xs text-muted font-body">
          {claim.clinician} · {claim.insurance} · {formatDate(claim.claimDate)} · {claim.serviceCode}
        </p>
        <p className="text-xs text-muted font-body">Current total: {formatCurrency(claim.totalPayment)}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                <p className="text-xs text-error mt-1 font-ui">{errors.paymentDateReceived.message}</p>
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
                <p className="text-xs text-error mt-1 font-ui">{errors.totalPayment.message}</p>
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
            className="w-full rounded-lg border border-border px-3 py-2 text-sm font-body text-ink resize-none focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal"
            placeholder="Optional notes…"
          />
        </div>

        {isError && (
          <p className="text-xs text-error font-ui bg-red-50 rounded-lg px-3 py-2">
            {(error as Error).message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" loading={isPending}>Save</Button>
        </div>
      </form>
    </Dialog>
  )
}
