interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

export function Skeleton({ width, height, className = '', rounded = 'md' }: SkeletonProps) {
  const radiusMap = { sm: 'rounded-sm', md: 'rounded-md', lg: 'rounded-lg', full: 'rounded-full' }
  return (
    <div
      className={`animate-pulse bg-border ${radiusMap[rounded]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

const CARD = 'bg-surface rounded-xl border border-border shadow-card'

export function SkeletonMetricCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${CARD} p-5 space-y-3`}>
          <Skeleton height={12} width="40%" />
          <Skeleton height={28} width="60%" />
          <Skeleton height={10} width="50%" />
        </div>
      ))}
    </div>
  )
}

/** Mirrors the dashboard's real layout so content doesn't jump when data arrives. */
export function SkeletonDashboard() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <Skeleton height={44} className="w-full" rounded="lg" />
      <SkeletonMetricCards />
      <SkeletonMetricCards count={3} />
      <div className={`${CARD} p-5 space-y-4`}>
        <Skeleton height={14} width="20%" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={26} />)}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className={`${CARD} p-5 lg:col-span-3`}><SkeletonChart height={220} /></div>
        <div className={`${CARD} p-5 lg:col-span-2 space-y-4`}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={36} />)}
        </div>
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 10 }: { rows?: number }) {
  return (
    <div className={`${CARD} overflow-hidden`} role="status" aria-label="Loading">
      <div className="border-b border-border px-5 py-3 flex gap-6 bg-surface-sunken">
        {[25, 15, 12, 12, 10, 10].map((w, i) => (
          <Skeleton key={i} height={12} width={`${w}%`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`px-5 py-3.5 flex gap-6 ${i % 2 === 1 ? 'bg-surface-sunken/50' : ''}`}>
          {[25, 15, 12, 12, 10, 10].map((w, j) => (
            <Skeleton key={j} height={11} width={`${w}%`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart({ height = 240 }: { height?: number }) {
  return <Skeleton height={height} className="w-full" rounded="lg" />
}

export function SkeletonForecastGroups() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 bg-surface-sunken flex justify-between items-center">
            <Skeleton height={14} width="30%" />
            <Skeleton height={14} width="12%" />
          </div>
        </div>
      ))}
    </div>
  )
}
