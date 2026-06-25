import { useLocation } from 'react-router-dom'
import { Menu, ChevronRight } from 'lucide-react'
import Avatar from '../ui/Avatar'

const BREADCRUMBS: Record<string, { parent?: string; label: string }> = {
  '/dashboard':   { label: 'Dashboard' },
  '/analytics':   { label: 'Analytics' },
  '/claims':      { label: 'Claims' },
  '/claims/new':  { parent: 'Claims', label: 'New Claim' },
  '/forecast':    { label: 'Revenue Forecast' },
  '/overhead':    { label: 'Overhead' },
  '/pay-periods': { label: 'Pay Periods' },
  '/staff':       { label: 'Staff' },
  '/staff/new':   { parent: 'Staff', label: 'New Staff' },
  '/caseloads':   { label: 'Caseloads' },
}

interface Props {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: Props) {
  const { pathname } = useLocation()

  let crumb = BREADCRUMBS[pathname]
  if (!crumb) {
    if (pathname.startsWith('/claims/') && pathname.endsWith('/edit')) {
      crumb = { parent: 'Claims', label: 'Edit Claim' }
    } else if (pathname.startsWith('/staff/')) {
      crumb = { parent: 'Staff', label: 'Staff Detail' }
    } else {
      crumb = { label: 'Clarity Admin' }
    }
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 h-12 px-6 bg-white border-b border-border">
      <button
        type="button"
        onClick={onMenuClick}
        className="md:hidden text-muted hover:text-teal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      {crumb.parent && (
        <nav className="flex items-center gap-1.5 text-sm font-ui">
          <span className="text-muted">{crumb.parent}</span>
          <ChevronRight size={14} className="text-muted/50" />
          <span className="font-medium text-ink">{crumb.label}</span>
        </nav>
      )}

      <div className="ml-auto">
        <Avatar name="Bruce Spadaccini" size="sm" />
      </div>
    </header>
  )
}
