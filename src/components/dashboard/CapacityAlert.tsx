import { ChevronDown, ChevronUp } from 'lucide-react'

interface CapacityAlertProps {
  alerts: { name: string; pct: number; level: 'warning' | 'danger' }[]
  collapsed: boolean
  onToggleCollapsed: () => void
}

export default function CapacityAlert({ alerts, collapsed, onToggleCollapsed }: CapacityAlertProps) {
  if (alerts.length === 0) return null

  const hasDanger = alerts.some(a => a.level === 'danger')
  const colorClasses = hasDanger ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
  const labelClasses = hasDanger ? 'text-error' : 'text-amber-700'

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapsed}
        className={`w-full flex items-center justify-between rounded-xl border px-5 py-2.5 text-left transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${colorClasses}`}
        aria-label="Expand capacity alert"
      >
        <span className={`text-xs font-body font-semibold uppercase tracking-wide ${labelClasses}`}>
          Capacity Alert — {alerts.map(a => a.name).join(', ')}
        </span>
        <ChevronDown size={16} className={labelClasses} />
      </button>
    )
  }

  return (
    <div className={`relative rounded-xl border px-5 py-4 pr-10 ${colorClasses}`}>
      <button
        onClick={onToggleCollapsed}
        className="absolute top-3 right-3 text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
        aria-label="Collapse"
      >
        <ChevronUp size={16} />
      </button>
      <p className={`text-xs font-body font-semibold uppercase tracking-wide mb-1 ${labelClasses}`}>
        Capacity Alert
      </p>
      <ul className="space-y-0.5">
        {alerts.map(a => (
          <li key={a.name} className={`text-sm font-body ${a.level === 'danger' ? 'text-error' : 'text-amber-800'}`}>
            {a.name} has been at {a.pct.toFixed(0)}% utilization over the last 3 weeks
            {a.level === 'danger' ? ' — over capacity, consider caseload review.' : ' — approaching capacity.'}
          </li>
        ))}
      </ul>
    </div>
  )
}
