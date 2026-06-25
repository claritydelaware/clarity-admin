import Avatar from '../../ui/Avatar'

interface Props {
  name: string
  className?: string
}

export default function PersonCell({ name, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Avatar name={name} size="md" />
      <span className="font-medium text-ink text-sm">{name}</span>
    </span>
  )
}
