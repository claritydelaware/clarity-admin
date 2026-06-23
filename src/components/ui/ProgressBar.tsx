interface ProgressBarProps {
  value: number
  max?: number
  color?: string
  size?: 'sm' | 'md'
  label?: string
  className?: string
}

export default function ProgressBar({ value, max = 100, color, size = 'md', label, className = '' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5'

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-ui text-muted">{label}</span>
          <span className="text-xs font-ui font-medium text-ink">{Math.round(pct)}%</span>
        </div>
      )}
      <div className={`w-full ${height} bg-surface-sunken rounded-full overflow-hidden`}>
        <div
          className={`${height} rounded-full transition-all duration-500 ease-out`}
          style={{
            width: `${pct}%`,
            backgroundColor: color || 'var(--color-teal)',
          }}
        />
      </div>
    </div>
  )
}
