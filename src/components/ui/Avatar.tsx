const CLINICIAN_COLORS: Record<string, string> = {
  Shannon: 'bg-[var(--color-clinician-shannon)] text-white',
  Jen:     'bg-[var(--color-clinician-jen)] text-ink',
  Emily:   'bg-[var(--color-clinician-emily)] text-white',
  Shana:   'bg-[var(--color-clinician-shana)] text-white',
}

const FALLBACK_COLORS = [
  'bg-teal text-white',
  'bg-gold text-ink',
  'bg-teal-mid text-white',
  'bg-gold-dark text-white',
]

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getColorClass(name: string): string {
  if (CLINICIAN_COLORS[name]) return CLINICIAN_COLORS[name]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length]
}

export default function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-full font-ui font-semibold shrink-0',
        SIZE_CLASSES[size],
        getColorClass(name),
        className,
      ].join(' ')}
      title={name}
    >
      {getInitials(name)}
    </span>
  )
}
