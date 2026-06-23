import type { ReactNode } from 'react'
import DeltaBadge from './DeltaBadge'
import Tooltip from './Tooltip'

interface MetricCardProps {
  label: string
  value: ReactNode
  sub?: string | null
  delta?: number | null
  deltaSuffix?: string
  deltaInvert?: boolean
  accentColor?: string
  icon?: ReactNode
  tooltipContent?: ReactNode
  index?: number
  className?: string
}

export default function MetricCard({
  label,
  value,
  sub,
  delta,
  deltaSuffix,
  deltaInvert,
  accentColor,
  icon,
  tooltipContent,
  index,
  className = '',
}: MetricCardProps) {
  const deltaEl = delta != null ? <DeltaBadge value={delta} suffix={deltaSuffix} invert={deltaInvert} /> : null

  return (
    <div
      className={`relative bg-surface rounded-xl border border-border shadow-card p-5 overflow-hidden ${index != null ? 'animate-slide-up-fade' : ''} ${className}`}
      style={index != null ? { animationDelay: `${index * 60}ms` } : undefined}
    >
      {accentColor && (
        <div
          className="absolute top-0 left-0 w-full h-1 rounded-t-xl"
          style={{ backgroundColor: accentColor }}
        />
      )}
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-xs font-ui font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-center justify-between mt-3">
        <p className="text-2xl font-heading font-semibold text-ink leading-tight">{value}</p>
        {deltaEl && (
          tooltipContent ? (
            <Tooltip content={tooltipContent} variant="card" maxWidth={300}>
              {deltaEl}
            </Tooltip>
          ) : deltaEl
        )}
      </div>
      {sub && <p className="text-xs text-muted font-body mt-1.5 leading-relaxed">{sub}</p>}
    </div>
  )
}
