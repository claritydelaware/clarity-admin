interface Props {
  value: number | null | undefined
  suffix?: string
  className?: string
}

export default function NumberCell({ value, suffix, className = '' }: Props) {
  if (value == null) return <span className="text-muted italic">—</span>

  return (
    <span className={`tabular-nums text-right ${className}`}>
      {value.toLocaleString()}{suffix}
    </span>
  )
}
