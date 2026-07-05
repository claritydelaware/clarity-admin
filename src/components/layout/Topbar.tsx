import { useLocation } from 'react-router-dom'
import { Menu, ChevronRight, Search } from 'lucide-react'
import Avatar from '../ui/Avatar'

const BREADCRUMBS: Record<string, { parent?: string; label: string }> = {
  '/dashboard':   { label: 'Dashboard' },
  '/analytics':   { label: 'Analytics' },
  '/claims':      { label: 'Claims' },
  '/forecast':    { label: 'Revenue Forecast' },
  '/overhead':    { label: 'Overhead' },
  '/pay-periods': { label: 'Pay Periods' },
  '/staff':       { label: 'Staff' },
  '/staff/new':   { parent: 'Staff', label: 'New Staff' },
  '/caseloads':   { label: 'Caseloads' },
  '/qa':          { label: 'Data QA' },
  '/valuation':   { label: 'Valuation' },
}

interface Props {
  onMenuClick: () => void
  onSearchClick: () => void
}

export default function Topbar({ onMenuClick, onSearchClick }: Props) {
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
    <header className="sticky top-0 z-30 flex items-center gap-4 h-12 px-4 md:px-6 bg-white border-b border-border">
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

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={onSearchClick}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-muted hover:text-teal hover:border-teal/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          aria-label="Open command palette"
        >
          <Search size={14} />
          <span className="text-xs font-ui">Search…</span>
          <kbd className="text-[10px] font-ui border border-border rounded px-1 py-0.5">⌘K</kbd>
        </button>
        <Avatar name="Bruce Spadaccini" size="sm" />
      </div>
    </header>
  )
}
