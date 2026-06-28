import Avatar from '../../ui/Avatar'

interface Props {
  name: string
  columnWidth?: number
  className?: string
}

export default function PersonCell({ name, columnWidth, className = '' }: Props) {
  const pixelSize = columnWidth ? Math.min(Math.max(columnWidth - 20, 24), 72) : undefined
  return (
    <span className={`inline-flex items-center justify-center ${className}`} title={name}>
      <Avatar name={name} size={pixelSize ? undefined : 'lg'} pixelSize={pixelSize} />
    </span>
  )
}
