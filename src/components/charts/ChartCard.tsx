import type { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export default function ChartCard({ title, subtitle, actions, children, className = '' }: ChartCardProps) {
  return (
    <div className={`bg-surface rounded-xl border border-border shadow-card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold font-heading text-ink">{title}</h3>
          {subtitle && <p className="text-xs text-muted font-body mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="px-5 pb-5">
        {children}
      </div>
    </div>
  )
}
