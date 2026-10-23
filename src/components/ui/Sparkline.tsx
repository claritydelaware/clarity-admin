interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  className?: string
}

/** Tiny trend line for KPI cards. Last point is marked; decorative (aria-hidden). */
export default function Sparkline({ data, width = 96, height = 28, color = 'var(--color-teal)', className = '' }: SparklineProps) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = 3
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2)
    const y = pad + (1 - (v - min) / range) * (height - pad * 2)
    return [x, y] as const
  })
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
      <circle cx={lx} cy={ly} r={2.5} fill={color} />
    </svg>
  )
}
