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
      className={`animate-pulse bg-gray-200 ${radiusMap[rounded]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

export function SkeletonMetricCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <Skeleton height={12} width="40%" />
          <Skeleton height={28} width="60%" />
          <Skeleton height={10} width="50%" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 10 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-3 flex gap-6">
        {[25, 15, 12, 12, 10, 10].map((w, i) => (
          <Skeleton key={i} height={12} width={`${w}%`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`px-5 py-3.5 flex gap-6 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
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
        <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 flex justify-between items-center">
            <Skeleton height={14} width="30%" />
            <Skeleton height={14} width="12%" />
          </div>
        </div>
      ))}
    </div>
  )
}
