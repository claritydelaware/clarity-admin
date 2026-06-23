import type { ReactNode } from 'react'
import DeltaBadge from './DeltaBadge'

interface MetricCardProps {
  label: string
  value: ReactNode
  delta?: number | null
  deltaSuffix?: string
  deltaInvert?: boolean
  accentColor?: string
  icon?: ReactNode
  className?: string
}

export default function MetricCard({
  label,
  value,
  delta,
  deltaSuffix,
  deltaInvert,
  accentColor,
  icon,
  className = '',
}: MetricCardProps) {
  return (
    <div className={`relative bg-surface rounded-xl border border-border shadow-card p-5 overflow-hidden ${className}`}>
      {accentColor && (
        <div
          className="absolute top-0 left-0 w-full h-1 rounded-t-xl"
          style={{ backgroundColor: accentColor }}
        />
      )}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-ui text-muted font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-heading font-bold text-ink leading-tight">{value}</p>
        </div>
        {icon && (
          <span className="text-muted/40">{icon}</span>
        )}
      </div>
      {delta != null && (
        <div className="mt-2">
          <DeltaBadge value={delta} suffix={deltaSuffix} invert={deltaInvert} />
        </div>
      )}
    </div>
  )
}
