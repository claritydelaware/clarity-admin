import { useMemo, useState } from 'react'
import { useCapacityRecentWeeks } from './useAnalytics'
import type { CapacityWeek } from '../types'

// Alerts average utilization over this many of the most recent complete
// weeks (rather than complete months) — a shorter, fresher lookback so a
// clinician's numbers recovering shows up within weeks, not after waiting
// for a stale high month to roll out of a 2-month average.
const ALERT_LOOKBACK_WEEKS = 3

interface CapacityAlert {
  name: string
  pct: number
  level: 'warning' | 'danger'
}

const COLLAPSE_STORAGE_KEY = 'clarity-admin:capacityAlertCollapse'

function getFingerprint(alerts: CapacityAlert[]): string {
  return alerts
    .map(a => `${a.name}:${a.level}:${Math.round(a.pct)}`)
    .sort()
    .join('|')
}

function readStoredCollapse(): { fingerprint: string; collapsed: boolean } | null {
  try {
    const raw = localStorage.getItem(COLLAPSE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStoredCollapse(fingerprint: string, collapsed: boolean) {
  try {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify({ fingerprint, collapsed }))
  } catch {
    // ignore write failures (e.g. private browsing)
  }
}

// Collapsed state persists across sessions, but only for the same set of
// alerts — if the alerts change (new person flagged, level changes, pct
// shifts a meaningful amount), the banner re-expands automatically.
export function useCapacityAlertCollapse(alerts: CapacityAlert[]) {
  const fingerprint = getFingerprint(alerts)
  const [state, setState] = useState(() => {
    const stored = readStoredCollapse()
    return { fingerprint, collapsed: stored?.fingerprint === fingerprint ? stored.collapsed : false }
  })

  // The alert set changed since the last render — reset to expanded. Adjusting
  // state during render (rather than in an effect) avoids an extra commit.
  if (state.fingerprint !== fingerprint) {
    setState({ fingerprint, collapsed: false })
    writeStoredCollapse(fingerprint, false)
  }

  const toggleCollapsed = () => {
    setState(prev => {
      const next = { fingerprint: prev.fingerprint, collapsed: !prev.collapsed }
      writeStoredCollapse(next.fingerprint, next.collapsed)
      return next
    })
  }

  return { collapsed: state.collapsed, toggleCollapsed }
}

export function useCapacityAlerts(): CapacityAlert[] {
  const { data: weeks } = useCapacityRecentWeeks()

  return useMemo(() => {
    if (!weeks || weeks.length === 0) return []
    const recent = weeks.slice(-ALERT_LOOKBACK_WEEKS)

    const avg = (vals: (number | null)[]): number | null => {
      const valid = vals.filter((v): v is number => v !== null)
      return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null
    }

    const alerts: CapacityAlert[] = []
    const checks: { name: string; getter: (w: CapacityWeek) => number | null }[] = [
      { name: 'Shannon', getter: w => w.shannonUtilPct },
      { name: 'Jen',     getter: w => w.jenUtilPct     },
      { name: 'Emily',   getter: w => w.emilyUtilPct   },
      { name: 'Shana',   getter: w => w.shanaUtilPct   },
    ]
    // utilPct fields are decimal fractions (0.94 = 94%); compare against
    // fraction thresholds and convert to a 0-100 display value separately.
    for (const { name, getter } of checks) {
      const a = avg(recent.map(getter))
      if (a === null) continue
      if (a >= 1) alerts.push({ name, pct: a * 100, level: 'danger' })
      else if (a >= 0.95) alerts.push({ name, pct: a * 100, level: 'warning' })
    }
    return alerts
  }, [weeks])
}
