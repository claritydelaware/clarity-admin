import { useState } from 'react'
import { CLAIM_STATUSES, type ClaimStatus } from '../../types'
import Dialog from '../ui/Dialog'
import Button from '../ui/Button'

interface BulkUpdateModalProps {
  selectedCount: number
  onConfirm: (update: { status: ClaimStatus; paymentDateReceived?: string }) => void
  onClose: () => void
  isSubmitting: boolean
}

export default function BulkUpdateModal({ selectedCount, onConfirm, onClose, isSubmitting }: BulkUpdateModalProps) {
  const [status, setStatus] = useState<ClaimStatus>('Payment Received')
  const [paymentDate, setPaymentDate] = useState('')

  const needsPaymentDate = status === 'Payment Received' || status === 'Payment Pending'
  const paymentDateRequired = status === 'Payment Received'
  const canSubmit = !paymentDateRequired || Boolean(paymentDate)

  const inputClass = 'w-full h-9 rounded-lg border border-border bg-white px-3 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal'
  const labelClass = 'block text-xs font-medium text-muted font-ui mb-1.5'

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Bulk Update — ${selectedCount} Claim${selectedCount !== 1 ? 's' : ''}`}
      maxWidth="sm"
    >
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as ClaimStatus)}
            className={inputClass}
          >
            {CLAIM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {needsPaymentDate && (
          <div>
            <label className={labelClass}>
              Payment Date Received{paymentDateRequired ? ' *' : ''}
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        <p className="text-xs text-muted font-body">
          Insurance amounts vary per claim — update those individually via inline editing after marking as received.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => canSubmit && onConfirm({ status, paymentDateReceived: needsPaymentDate && paymentDate ? paymentDate : undefined })}
          disabled={!canSubmit}
          loading={isSubmitting}
        >
          Update {selectedCount} Claim{selectedCount !== 1 ? 's' : ''}
        </Button>
      </div>
    </Dialog>
  )
}
