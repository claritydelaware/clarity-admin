import type { ClaimStatus } from '../../../types'

const STATUS_COLORS: Record<string, string> = {
  'Pending':           'var(--color-status-orange)',
  'Payment Received':  'var(--color-status-green)',
  'Denied':            'var(--color-status-red)',
  'Deductible':        'var(--color-status-blue)',
  'Sent to Secondary': 'var(--color-status-purple)',
  'Finalized':         'var(--color-status-gray)',
  'Payment Pending':   'var(--color-status-green)',
}

export { STATUS_COLORS }

interface Props {
  status: ClaimStatus
  onClick?: () => void
}

export default function StatusCell({ status, onClick }: Props) {
  const bg = STATUS_COLORS[status] || 'var(--color-status-gray)'

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full py-1 px-2 rounded-full text-white text-xs font-ui font-medium text-center cursor-pointer hover:opacity-85 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-teal"
        style={{ backgroundColor: bg }}
        title="Click to update status"
      >
        {status}
      </button>
    )
  }

  return (
    <span
      className="block w-full py-1 px-2 rounded-full text-white text-xs font-ui font-medium text-center"
      style={{ backgroundColor: bg }}
    >
      {status}
    </span>
  )
}
