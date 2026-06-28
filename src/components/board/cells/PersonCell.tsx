import Avatar from '../../ui/Avatar'

interface Props {
  name: string
  className?: string
}

export default function PersonCell({ name, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center justify-center ${className}`} title={name}>
      <Avatar name={name} size="lg" />
    </span>
  )
}
