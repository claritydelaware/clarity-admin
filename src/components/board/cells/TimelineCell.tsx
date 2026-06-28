interface Props {
  claimDate: string
  forecastPaymentDate: string
  paymentDateReceived?: string
  status: string
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

const FALLBACK_SPAN = 30

export default function TimelineCell({ claimDate, forecastPaymentDate, paymentDateReceived, status }: Props) {
  if (!claimDate) return <span className="text-muted italic text-xs">—</span>

  const claim = new Date(claimDate)
  if (isNaN(claim.getTime())) return <span className="text-muted italic text-xs">—</span>

  const isReceived = status === 'Payment Received' || status === 'Finalized'
  const received = paymentDateReceived ? new Date(paymentDateReceived) : null

  const forecast = forecastPaymentDate ? new Date(forecastPaymentDate) : null
  const hasForecast = forecast && !isNaN(forecast.getTime())
  const totalSpan = hasForecast ? daysBetween(claim, forecast) : 0

  let pct: number
  let daysLabel: string
  let barColor: string

  if (totalSpan <= 0 && isReceived) {
    const actualDays = received ? daysBetween(claim, received) : 0
    pct = 1
    daysLabel = actualDays === 0 ? 'Same-day payment' : `Paid in ${actualDays}d`
    barColor = 'var(--color-status-green)'
  } else if (isReceived && received) {
    pct = 1
    const actualDays = daysBetween(claim, received)
    const diff = actualDays - totalSpan
    daysLabel = diff <= 0
      ? `Paid in ${actualDays}d (${Math.abs(diff)}d early)`
      : `Paid in ${actualDays}d (${diff}d late)`
    barColor = diff <= 0 ? 'var(--color-status-green)' : 'var(--color-status-orange)'
  } else {
    const span = totalSpan > 0 ? totalSpan : FALLBACK_SPAN
    const today = new Date()
    const elapsed = daysBetween(claim, today)
    pct = Math.min(elapsed / span, 1.5)
    const remaining = span - elapsed

    if (remaining > 0) {
      daysLabel = `${remaining}d remaining of ${span}d expected`
    } else {
      daysLabel = `${Math.abs(remaining)}d overdue (expected ${span}d)`
    }

    if (pct > 1) {
      barColor = 'var(--color-status-red)'
    } else if (pct > 0.75) {
      barColor = 'var(--color-status-orange)'
    } else {
      barColor = 'var(--color-status-green)'
    }
  }

  const displayPct = Math.min(pct, 1) * 100

  const tooltipText = `${daysLabel} (${Math.round(displayPct)}%)`

  return (
    <div className="flex items-center justify-center w-full" title={tooltipText}>
      <div
        className="relative w-full h-3 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-border, #e5e7eb)' }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
          style={{
            width: `${displayPct}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  )
}
