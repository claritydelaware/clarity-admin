import { ExternalLink } from 'lucide-react'

interface Props {
  href: string
  title?: string
}

export default function LinkCell({ href, title = 'Open link' }: Props) {
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      onClick={e => e.stopPropagation()}
      className="inline-flex items-center justify-center text-muted hover:text-teal transition-colors p-1"
    >
      <ExternalLink size={14} />
    </a>
  )
}
