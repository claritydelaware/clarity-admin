import { Link, useLocation } from 'react-router-dom'
import { Menu, ChevronRight, Search } from 'lucide-react'
import { NAV_GROUPS } from './navConfig'
import SyncStatus from './SyncStatus'
import AccountMenu from './AccountMenu'

interface Crumb { group?: string; parent?: { label: string; to: string }; label: string }

// Sub-pages that aren't in the sidebar.
const DETAIL_PAGES: { test: (p: string) => boolean; parent: string; label: string }[] = [
  { test: p => p === '/staff/new',                              parent: '/staff',  label: 'New Staff' },
  { test: p => /^\/claims\/.+\/edit$/.test(p),                  parent: '/claims', label: 'Edit Claim' },
  { test: p => p.startsWith('/staff/'),                         parent: '/staff',  label: 'Staff Detail' },
]

function resolveCrumb(pathname: string): Crumb {
  const detail = DETAIL_PAGES.find(d => d.test(pathname))
  for (const g of NAV_GROUPS) {
    for (const item of g.items) {
      if (detail && item.to === detail.parent) {
        return { group: g.label, parent: { label: item.label, to: item.to }, label: detail.label }
      }
      if (!detail && pathname.startsWith(item.to)) return { group: g.label, label: item.label }
    }
  }
  return { label: 'Clarity Admin' }
}

interface Props {
  onMenuClick: () => void
  onSearchClick: () => void
}

export default function Topbar({ onMenuClick, onSearchClick }: Props) {
  const { pathname } = useLocation()
  const crumb = resolveCrumb(pathname)

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

      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm font-ui min-w-0">
        {crumb.group && <span className="text-muted hidden sm:inline">{crumb.group}</span>}
        {crumb.group && <ChevronRight size={14} className="text-muted/50 hidden sm:block shrink-0" />}
        {crumb.parent ? (
          <>
            <Link to={crumb.parent.to} className="text-muted hover:text-teal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded">
              {crumb.parent.label}
            </Link>
            <ChevronRight size={14} className="text-muted/50 shrink-0" />
          </>
        ) : null}
        <span className="font-medium text-ink truncate" aria-current="page">{crumb.label}</span>
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <SyncStatus />
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
        <AccountMenu />
      </div>
    </header>
  )
}
