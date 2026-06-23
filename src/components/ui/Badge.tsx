import type { ClaimStatus } from '../../types'
import { getPayerStyle } from '../../lib/utils'

const STATUS_COLORS: Record<ClaimStatus, string> = {
  'Pending':           'var(--color-status-orange)',
  'Payment Received':  'var(--color-status-green)',
  'Finalized':         'var(--color-status-gray)',
  'Denied':            'var(--color-status-red)',
  'Deductible':        'var(--color-status-blue)',
  'Sent to Secondary': 'var(--color-status-purple)',
  'Payment Pending':   'var(--color-status-green)',
}

interface Props {
  status: ClaimStatus
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}

const BASE = 'inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-ui font-medium whitespace-nowrap'

export default function Badge({ status, onClick }: Props) {
  const bg = STATUS_COLORS[status] ?? 'var(--color-status-gray)'

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${BASE} text-white cursor-pointer hover:opacity-85 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-teal`}
        style={{ backgroundColor: bg }}
        title="Click to update status"
      >
        {status}
      </button>
    )
  }

  return (
    <span className={`${BASE} text-white`} style={{ backgroundColor: bg }}>
      {status}
    </span>
  )
}

const PILL = 'inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium font-body whitespace-nowrap'

export function PayerBadge({ payer }: { payer: string }) {
  return (
    <span className={PILL} style={getPayerStyle(payer)}>
      {payer}
    </span>
  )
}
