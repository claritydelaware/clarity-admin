import { useEffect, useRef, useState } from 'react'
import { LogOut } from 'lucide-react'
import Avatar from '../ui/Avatar'

// Cloudflare Access serves this path on the protected hostname and ends the session.
const ACCESS_LOGOUT_URL = '/cdn-cgi/access/logout'

export default function AccountMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
      >
        <Avatar name="Bruce Spadaccini" size="sm" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-white py-1 shadow-lg animate-slide-down">
          <p className="px-3 py-2 text-xs font-ui text-muted border-b border-border">Bruce Spadaccini Jr.<br />Administrative Partner</p>
          <a
            role="menuitem"
            href={ACCESS_LOGOUT_URL}
            className="flex items-center gap-2 px-3 py-2 text-sm font-ui text-ink hover:bg-teal-pale transition-colors focus-visible:outline-none focus-visible:bg-teal-pale"
          >
            <LogOut size={14} /> Sign out
          </a>
        </div>
      )}
    </div>
  )
}
