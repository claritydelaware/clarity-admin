import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  title?: string
  subtitle?: string
  actions?: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export default function Card({ children, title, subtitle, actions, className = '', padding = 'md' }: CardProps) {
  const hasHeader = title || subtitle || actions

  return (
    <div className={`bg-surface rounded-xl border border-border shadow-card ${className}`}>
      {hasHeader && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            {title && <h3 className="text-sm font-semibold font-heading text-ink">{title}</h3>}
            {subtitle && <p className="text-xs text-muted font-body mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={PADDING[padding]}>{children}</div>
    </div>
  )
}
