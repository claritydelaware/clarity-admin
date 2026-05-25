import type { ClaimStatus } from '../../types'

const STYLES: Record<ClaimStatus, string> = {
  'Pending':            'bg-[#f1c232] text-ink',
  'Payment Received':   'bg-[#b7e1cd] text-ink',
  'Finalized':          'bg-[#fff2cc] text-ink',
  'Denied':             'bg-[#f4cccc] text-ink',
  'Deductible':         'bg-[#cfe2f3] text-ink',
  'Sent to Secondary':  'bg-[#b7e1cd] text-ink',
  'Payment Pending':    'bg-[#d9ead3] text-ink',
}

interface Props {
  status: ClaimStatus
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}

export default function Badge({ status, onClick }: Props) {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium font-body whitespace-nowrap'
  const color = STYLES[status] ?? 'bg-muted text-white'
  const interactive = onClick
    ? 'cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-teal'
    : ''

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} ${color} ${interactive}`}
        title="Click to update status"
      >
        {status}
      </button>
    )
  }

  return <span className={`${base} ${color}`}>{status}</span>
}
