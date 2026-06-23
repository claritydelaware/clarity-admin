import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <span className="text-muted/30 mb-3">
        {icon || <Inbox size={40} />}
      </span>
      <h3 className="text-sm font-heading font-semibold text-ink mb-1">{title}</h3>
      {description && <p className="text-xs text-muted font-body text-center max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
