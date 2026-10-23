import { useEffect, useState } from 'react'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'

function relative(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.round(m / 60)}h ago`
}

/** Shows when the Sheet data was last pulled and lets you force a refresh. */
export default function SyncStatus() {
  const qc = useQueryClient()
  const fetching = useIsFetching() > 0
  const [, tick] = useState(0)

  // Derived each render; re-renders on fetch start/finish and on the 30s tick below.
  const times = qc.getQueryCache().getAll().map(q => q.state.dataUpdatedAt).filter(Boolean)
  const lastSynced = times.length ? Math.max(...times) : null

  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <button
      type="button"
      onClick={() => qc.invalidateQueries()}
      disabled={fetching}
      className="hidden md:flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-ui text-muted hover:text-teal hover:bg-surface-sunken transition-colors disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
      title="Refresh data from the Claim Tracking sheet"
      aria-label={fetching ? 'Refreshing data' : 'Refresh data'}
    >
      <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} />
      <span className="tabular-nums" aria-live="polite">
        {fetching ? 'Syncing…' : lastSynced ? `Updated ${relative(lastSynced)}` : 'Refresh'}
      </span>
    </button>
  )
}
