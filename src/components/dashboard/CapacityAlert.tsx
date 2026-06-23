import { X } from 'lucide-react'

interface CapacityAlertProps {
  alerts: { name: string; pct: number; level: 'warning' | 'danger' }[]
  onDismiss: () => void
}

export default function CapacityAlert({ alerts, onDismiss }: CapacityAlertProps) {
  if (alerts.length === 0) return null

  const hasDanger = alerts.some(a => a.level === 'danger')

  return (
    <div className={`relative rounded-xl border px-5 py-4 pr-10 ${
      hasDanger ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
    }`}>
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
      <p className={`text-xs font-body font-semibold uppercase tracking-wide mb-1 ${
        hasDanger ? 'text-error' : 'text-amber-700'
      }`}>
        Capacity Alert
      </p>
      <ul className="space-y-0.5">
        {alerts.map(a => (
          <li key={a.name} className={`text-sm font-body ${a.level === 'danger' ? 'text-error' : 'text-amber-800'}`}>
            {a.name} has been at {a.pct.toFixed(0)}% utilization over the last 2 months
            {a.level === 'danger' ? ' — over capacity, consider caseload review.' : ' — approaching capacity.'}
          </li>
        ))}
      </ul>
    </div>
  )
}
