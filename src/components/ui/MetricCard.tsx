import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import DeltaBadge from './DeltaBadge'
import Tooltip from './Tooltip'
import Sparkline from './Sparkline'
import StackedBar, { type StackedSegment } from './StackedBar'

interface MetricCardProps {
  label: string
  value: ReactNode
  sub?: string | null
  /** Plain-text comparison line shown under the value, e.g. "vs $42,100 last month". */
  caption?: string | null
  delta?: number | null
  deltaSuffix?: string
  deltaInvert?: boolean
  accentColor?: string
  icon?: ReactNode
  /** Definition shown from an (i) icon next to the label. */
  info?: string
  tooltipContent?: ReactNode
  sparkline?: number[]
  breakdown?: StackedSegment[]
  index?: number
  className?: string
}

export default function MetricCard({
  label,
  value,
  sub,
  caption,
  delta,
  deltaSuffix,
  deltaInvert,
  accentColor,
  icon,
  info,
  tooltipContent,
  sparkline,
  breakdown,
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
        {info && (
          <Tooltip content={info} maxWidth={260}>
            <span tabIndex={0} role="img" aria-label={info} className="inline-flex text-muted/70 hover:text-teal focus-visible:text-teal cursor-help">
              <Info size={13} />
            </span>
          </Tooltip>
        )}
      </div>
      <div className="flex items-end justify-between gap-3 mt-3">
        <p className="text-2xl font-heading font-semibold text-ink leading-tight tabular-nums">{value}</p>
        {sparkline && sparkline.length > 1 && <Sparkline data={sparkline} className="shrink-0 mb-0.5" />}
      </div>
      {(deltaEl || caption) && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {deltaEl && (
            tooltipContent ? (
              <Tooltip content={tooltipContent} variant="card" maxWidth={300}>
                {deltaEl}
              </Tooltip>
            ) : deltaEl
          )}
          {caption && <span className="text-xs text-muted font-body tabular-nums">{caption}</span>}
        </div>
      )}
      {sub && <p className="text-xs text-muted font-body mt-1.5 leading-relaxed">{sub}</p>}
      {breakdown && breakdown.length > 0 && <StackedBar segments={breakdown} className="mt-3" />}
    </div>
  )
}
