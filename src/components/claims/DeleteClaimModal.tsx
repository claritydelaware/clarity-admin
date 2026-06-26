import type { Claim } from '../../types'
import { useDeleteClaim } from '../../hooks/useClaims'
import { formatCurrency, formatDate } from '../../lib/utils'
import Dialog from '../ui/Dialog'
import Button from '../ui/Button'

interface Props {
  claim: Claim
  onClose: () => void
  onDeleted?: () => void
}

export default function DeleteClaimModal({ claim, onClose, onDeleted }: Props) {
  const { mutate, isPending } = useDeleteClaim()

  return (
    <Dialog open onClose={onClose} title="Delete Claim">
      <div className="space-y-4">
        <p className="text-sm text-ink font-body">
          Are you sure you want to delete this claim? This cannot be undone.
        </p>

        <div className="bg-surface-sunken rounded-lg px-4 py-3 text-xs text-muted font-body space-y-1">
          <p><span className="font-medium text-ink">{claim.clinician}</span> · {claim.insurance} · {formatDate(claim.claimDate)}</p>
          <p>Code: {claim.serviceCode} · Status: {claim.status}</p>
          <p>Total: {formatCurrency(claim.totalPayment)}</p>
          {claim.claimId && <p>Claim ID: {claim.claimId}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} type="button" disabled={isPending}>Cancel</Button>
          <Button
            variant="danger"
            loading={isPending}
            onClick={() => mutate(claim.rowIndex, { onSuccess: () => { onClose(); onDeleted?.() } })}
          >
            Delete
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
