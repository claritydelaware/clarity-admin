import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, BellOff, CheckCircle2, ChevronRight, Undo2 } from 'lucide-react'
import type { AttentionItem, SnoozedItem, SnoozeMode } from '../../hooks/useAttention'

interface Props {
  items: AttentionItem[]
  snoozed: SnoozedItem[]
  onSnooze: (item: AttentionItem, mode: SnoozeMode) => void
  onRestore: (key: string) => void
}

const OPTIONS: { mode: SnoozeMode; label: string; hint: string }[] = [
  { mode: '1d', label: 'Snooze for 1 day', hint: 'Back tomorrow' },
  { mode: '1w', label: 'Snooze for 1 week', hint: 'Back in 7 days' },
  { mode: 'changes', label: 'Dismiss until it changes', hint: 'Back if the count grows' },
]

function snoozeNote(s: SnoozedItem): string {
  if (s.snooze.until && s.snooze.until > Date.now()) {
    return `Snoozed until ${new Date(s.snooze.until).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }
  return `Dismissed at ${s.snooze.count}`
}

function SnoozeMenu({ item, onSnooze }: { item: AttentionItem; onSnooze: Props['onSnooze'] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Snooze or dismiss: ${item.label}`}
        title="Snooze or dismiss"
        className="rounded-md p-1.5 text-muted/70 hover:bg-surface-sunken hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
      >
        <BellOff size={14} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-border bg-white py-1 shadow-lg animate-slide-down">
          {OPTIONS.map(o => (
            <button
              key={o.mode}
              type="button"
              role="menuitem"
              onClick={() => { onSnooze(item, o.mode); setOpen(false) }}
              className="block w-full px-3 py-2 text-left hover:bg-teal-pale transition-colors focus-visible:outline-none focus-visible:bg-teal-pale"
            >
              <span className="block text-sm font-ui text-ink">{o.label}</span>
              <span className="block text-[11px] font-body text-muted">{o.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AttentionStrip({ items, snoozed, onSnooze, onRestore }: Props) {
  const [showSnoozed, setShowSnoozed] = useState(false)

  const snoozedFooter = snoozed.length > 0 && (
    <div className="border-t border-border bg-surface-sunken/60 rounded-b-xl">
      <button
        type="button"
        onClick={() => setShowSnoozed(s => !s)}
        aria-expanded={showSnoozed}
        className="w-full px-5 py-2 text-left text-xs font-ui text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal rounded-b-xl"
      >
        {snoozed.length} snoozed · {showSnoozed ? 'Hide' : 'Show'}
      </button>
      {showSnoozed && (
        <ul className="divide-y divide-border border-t border-border">
          {snoozed.map(s => (
            <li key={s.key} className="flex items-center gap-3 px-5 py-2 text-sm font-body text-muted">
              <span className="truncate">{s.label}</span>
              <span className="text-[11px] shrink-0">{snoozeNote(s)}</span>
              <button
                type="button"
                onClick={() => onRestore(s.key)}
                className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-ui text-teal hover:bg-teal-pale transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                <Undo2 size={12} /> Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface shadow-card">
        <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-body text-muted">
          <CheckCircle2 size={15} className="text-success shrink-0" />
          {snoozed.length > 0 ? 'Nothing needs attention right now (some items are snoozed).' : 'Nothing needs attention right now.'}
        </div>
        {snoozedFooter}
      </div>
    )
  }

  return (
    <section aria-label="Needs attention" className="rounded-xl border border-border bg-surface shadow-card">
      <div className="flex items-center gap-2 rounded-t-xl border-b border-border bg-surface-sunken px-5 py-2.5">
        <AlertTriangle size={14} className="text-warning" />
        <h2 className="text-xs font-ui font-semibold uppercase tracking-wider text-ink">Needs attention</h2>
      </div>
      <ul className="divide-y divide-border">
        {items.map(i => (
          <li key={i.key} className="flex items-center pr-3 hover:bg-surface-sunken transition-colors">
            <Link
              to={i.to}
              className="group flex min-w-0 flex-1 items-center gap-3 px-5 py-2.5 text-sm font-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal"
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${i.level === 'danger' ? 'bg-error' : 'bg-gold-dark'}`} aria-hidden="true" />
              <span className="text-ink">{i.label}</span>
              <span className="sr-only">{i.level === 'danger' ? '(urgent)' : '(warning)'}</span>
              <ChevronRight size={14} className="ml-auto text-muted/60 group-hover:text-teal transition-colors" />
            </Link>
            <SnoozeMenu item={i} onSnooze={onSnooze} />
          </li>
        ))}
      </ul>
      {snoozedFooter}
    </section>
  )
}
