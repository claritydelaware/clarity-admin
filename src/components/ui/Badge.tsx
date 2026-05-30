import type { ClaimStatus } from '../../types'
import { getPayerStyle } from '../../lib/utils'

interface StatusStyle {
  container: string
  pip: string
  text: string
}

const STYLES: Record<ClaimStatus, StatusStyle> = {
  'Pending':           { container: 'bg-gold-tint border border-gold/40',      pip: 'bg-gold-dark',  text: 'text-gold-dark'  },
  'Payment Received':  { container: 'bg-green-50 border border-green-200',      pip: 'bg-success',    text: 'text-green-700'  },
  'Finalized':         { container: 'bg-gray-100 border border-gray-200',       pip: 'bg-muted',      text: 'text-muted'      },
  'Denied':            { container: 'bg-red-50 border border-red-200',          pip: 'bg-error',      text: 'text-error'      },
  'Deductible':        { container: 'bg-blue-50 border border-blue-200',        pip: 'bg-blue-500',   text: 'text-blue-700'   },
  'Sent to Secondary': { container: 'bg-teal-pale border border-teal-mid/30',   pip: 'bg-teal-mid',   text: 'text-teal'       },
  'Payment Pending':   { container: 'bg-green-50 border border-green-200',      pip: 'bg-success',    text: 'text-green-700'  },
}

const FALLBACK: StatusStyle = { container: 'bg-gray-100 border border-gray-200', pip: 'bg-muted', text: 'text-muted' }

interface Props {
  status: ClaimStatus
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}

const BASE = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium font-body whitespace-nowrap'

export default function Badge({ status, onClick }: Props) {
  const s = STYLES[status] ?? FALLBACK

  const pip = <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.pip}`} />

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${BASE} ${s.container} ${s.text} cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-teal`}
        title="Click to update status"
      >
        {pip}
        {status}
      </button>
    )
  }

  return (
    <span className={`${BASE} ${s.container} ${s.text}`}>
      {pip}
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
