import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, Plus, FileText, CornerDownLeft } from 'lucide-react'
import Dialog from './ui/Dialog'
import { NAV } from './layout/Sidebar'
import { useClaims } from '../hooks/useClaims'
import { formatCurrency } from '../lib/utils'

interface Props {
  open: boolean
  onClose: () => void
}

interface PaletteItem {
  id: string
  icon: React.ReactNode
  label: string
  sublabel?: string
  action: () => void
}

const MAX_CLAIM_MATCHES = 6

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()

  const trimmed = query.trim().toLowerCase()
  // Pass {} rather than undefined so this shares a TanStack Query cache key
  // with Claims.tsx's default (unfiltered) query instead of triggering a
  // redundant full-sheet fetch when the Claims page is already loaded.
  const { data: claims } = useClaims({}, { enabled: open && trimmed.length >= 2 })

  // Build a /claims deep link that preserves whatever filters are already in
  // the URL if the palette is opened while sitting on the Claims page itself —
  // navigate('/claims?edit=1') would otherwise blow away active filters
  // (clinician/status/date range/etc., which ClaimsFilters.tsx also stores in
  // this same URL) since it replaces the full search string, not just adds to it.
  function claimsUrl(params: Record<string, string>): string {
    const sp = location.pathname === '/claims' ? new URLSearchParams(location.search) : new URLSearchParams()
    for (const [key, value] of Object.entries(params)) sp.set(key, value)
    return `/claims?${sp.toString()}`
  }

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveIndex(0)
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  function close() {
    onClose()
  }

  const items = useMemo<PaletteItem[]>(() => {
    const result: PaletteItem[] = []

    if (!trimmed || 'new claim'.includes(trimmed) || 'new'.includes(trimmed)) {
      result.push({
        id: 'action-new-claim',
        icon: <Plus size={15} />,
        label: 'New Claim',
        sublabel: 'Create a new claim',
        action: () => navigate(claimsUrl({ new: '1' })),
      })
    }

    for (const { to, label, icon: Icon } of NAV) {
      if (trimmed && !label.toLowerCase().includes(trimmed)) continue
      result.push({
        id: `nav-${to}`,
        icon: <Icon size={15} />,
        label,
        sublabel: 'Go to page',
        action: () => navigate(to),
      })
    }

    if (trimmed.length >= 2 && claims) {
      const matches = claims
        .filter(c =>
          (c.claimId ?? '').toLowerCase().includes(trimmed) ||
          (c.clientId ?? '').toLowerCase().includes(trimmed)
        )
        .slice(0, MAX_CLAIM_MATCHES)

      for (const c of matches) {
        result.push({
          id: `claim-${c.rowIndex}`,
          icon: <FileText size={15} />,
          label: c.claimId ? `Claim ${c.claimId}` : `Client ${c.clientId}`,
          sublabel: `${c.clinician} · ${c.insurance} · ${formatCurrency(c.totalPayment)} · ${c.status}`,
          action: () => navigate(claimsUrl({ edit: String(c.rowIndex), claimId: c.claimId ?? '' })),
        })
      }
    }

    return result
  }, [trimmed, claims, navigate, location])

  function select(item: PaletteItem) {
    item.action()
    close()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = items[activeIndex]
      if (item) select(item)
    }
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="lg" hideCloseButton>
      <div className="-m-5">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="text-muted shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Navigate, jump to a claim, or create a new one…"
            className="flex-1 bg-transparent text-sm font-body text-ink placeholder:text-muted focus:outline-none"
          />
          <kbd className="hidden sm:inline text-[10px] font-ui text-muted border border-border rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {items.length === 0 && (
            <p className="px-4 py-6 text-sm font-body text-muted text-center">No matches</p>
          )}
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => select(item)}
              className={[
                'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                i === activeIndex ? 'bg-teal-pale text-teal' : 'text-ink hover:bg-surface-sunken',
              ].join(' ')}
            >
              <span className={i === activeIndex ? 'text-teal' : 'text-muted'}>{item.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-ui font-medium truncate">{item.label}</span>
                {item.sublabel && (
                  <span className="block text-xs font-body text-muted truncate">{item.sublabel}</span>
                )}
              </span>
              {i === activeIndex && <CornerDownLeft size={13} className="text-teal shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  )
}
