import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface DeltaBadgeProps {
  value: number | null | undefined
  suffix?: string
  invert?: boolean
  className?: string
}

export default function DeltaBadge({ value, suffix = '%', invert = false, className = '' }: DeltaBadgeProps) {
  if (value == null || !isFinite(value)) return null

  const isPositive = invert ? value < 0 : value > 0
  const isNegative = invert ? value > 0 : value < 0
  const isNeutral = value === 0

  const colorCls = isPositive
    ? 'text-success bg-success-bg'
    : isNegative
    ? 'text-error bg-error-bg'
    : 'text-muted bg-surface-sunken'

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-ui font-medium ${colorCls} ${className}`}>
      <Icon size={12} />
      {isNeutral ? '0' : `${value > 0 ? '+' : ''}${Number.isInteger(value) ? value : value.toFixed(1)}`}{suffix}
    </span>
  )
}
