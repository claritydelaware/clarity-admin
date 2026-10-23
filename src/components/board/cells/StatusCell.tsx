import type { ClaimStatus } from '../../../types'

import { CLAIM_STATUS_STYLE } from '../../../lib/chartTheme'

const STATUS_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(CLAIM_STATUS_STYLE).map(([k, v]) => [k, v.bg]),
)

export { STATUS_COLORS }

interface Props {
  status: ClaimStatus
  onClick?: () => void
}

export default function StatusCell({ status, onClick }: Props) {
  const { bg, fg } = CLAIM_STATUS_STYLE[status] ?? { bg: 'var(--color-status-gray)', fg: '#fff' }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full min-w-0 py-1 px-2 rounded-full text-xs whitespace-nowrap overflow-hidden text-ellipsis font-ui font-medium text-center cursor-pointer hover:opacity-85 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-teal"
        style={{ backgroundColor: bg, color: fg }}
        title="Click to update status"
      >
        {status}
      </button>
    )
  }

  return (
    <span
      className="block w-full min-w-0 py-1 px-2 rounded-full text-xs whitespace-nowrap overflow-hidden text-ellipsis font-ui font-medium text-center"
      style={{ backgroundColor: bg, color: fg }}
    >
      {status}
    </span>
  )
}
