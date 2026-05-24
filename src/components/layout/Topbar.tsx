import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/claims':     'Claims',
  '/claims/new': 'New Claim',
}

interface Props {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: Props) {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'Clarity Admin'

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 h-14 px-6 bg-white border-b border-gray-200">
      <button
        type="button"
        onClick={onMenuClick}
        className="md:hidden text-gray-400 hover:text-teal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      <h1 className="font-heading text-teal text-xl font-semibold">{title}</h1>

      <span className="ml-auto text-sm text-muted font-body">
        bruce@claritydelaware.com
      </span>
    </header>
  )
}
