import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { CLAIM_STATUSES, type ClaimStatus } from '../../types'

interface BulkUpdateModalProps {
  selectedCount: number
  onConfirm: (update: { status: ClaimStatus; paymentDateReceived?: string }) => void
  onClose: () => void
  isSubmitting: boolean
}

export default function BulkUpdateModal({ selectedCount, onConfirm, onClose, isSubmitting }: BulkUpdateModalProps) {
  const [status, setStatus] = useState<ClaimStatus>('Payment Received')
  const [paymentDate, setPaymentDate] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  const needsPaymentDate = status === 'Payment Received' || status === 'Payment Pending'
  const paymentDateRequired = status === 'Payment Received'
  const canSubmit = !paymentDateRequired || Boolean(paymentDate)

  const labelClass = 'block text-xs font-medium text-muted font-body mb-1'
  const inputClass = 'w-full h-9 rounded border border-gray-200 px-3 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative bg-white rounded-xl shadow-xl w-full max-w-sm outline-none"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-heading text-base font-semibold text-ink">
            Bulk Update — {selectedCount} Claim{selectedCount !== 1 ? 's' : ''}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
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

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-body text-muted hover:text-ink rounded border border-gray-200 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => canSubmit && onConfirm({ status, paymentDateReceived: needsPaymentDate && paymentDate ? paymentDate : undefined })}
            disabled={!canSubmit || isSubmitting}
            className="px-4 py-2 text-sm font-body bg-teal text-white rounded hover:bg-teal-mid transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            {isSubmitting ? 'Updating…' : `Update ${selectedCount} Claim${selectedCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
