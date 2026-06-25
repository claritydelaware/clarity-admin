const CLINICIAN_COLORS: Record<string, string> = {
  Shannon: 'bg-[var(--color-clinician-shannon)] text-white',
  Jen:     'bg-[var(--color-clinician-jen)] text-ink',
  Emily:   'bg-[var(--color-clinician-emily)] text-white',
  Shana:   'bg-[var(--color-clinician-shana)] text-white',
}

const CLINICIAN_PHOTOS: Record<string, string> = {
  Shannon: '/avatars/shannon-tarolli.webp',
  Jen:     '/avatars/jen-meehan.webp',
  Emily:   '/avatars/emily-bryant.webp',
  Shana:   '/avatars/shana_1.jpg',
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

const SIZE_DIMS = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
}

const SIZE_TEXT = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
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
  const photo = CLINICIAN_PHOTOS[name]

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        title={name}
        className={[
          'rounded-full object-cover shrink-0',
          SIZE_DIMS[size],
          className,
        ].join(' ')}
      />
    )
  }

  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-full font-ui font-semibold shrink-0',
        SIZE_DIMS[size],
        SIZE_TEXT[size],
        getColorClass(name),
        className,
      ].join(' ')}
      title={name}
    >
      {getInitials(name)}
    </span>
  )
}
