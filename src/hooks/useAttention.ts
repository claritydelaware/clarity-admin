import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useClaims } from './useClaims'
import { useStaff } from './useStaff'
import { useCEStatus } from './useCE'
import { isArchived } from '../lib/utils'

export interface AttentionItem {
  key: string
  label: string
  count: number
  to: string
  level: 'warning' | 'danger'
}

/**
 * `until`: hidden until this timestamp (ms).
 * `count`: hidden until the item's count grows past this value ("dismiss until it changes").
 */
interface Snooze { until?: number; count?: number }
type SnoozeMap = Record<string, Snooze>
export type SnoozeMode = '1d' | '1w' | 'changes'

export interface SnoozedItem extends AttentionItem {
  snooze: Snooze
}

const LICENSE_WARNING_DAYS = 90
const STORAGE_KEY = 'clarity-admin:attentionSnoozes'
const DAY = 86400000

// ─── tiny shared store so the dashboard strip and sidebar badges stay in sync ──
const listeners = new Set<() => void>()
function readRaw(): string {
  try { return localStorage.getItem(STORAGE_KEY) ?? '{}' } catch { return '{}' }
}
function writeSnoozes(next: SnoozeMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* private mode — snooze lasts until reload */ }
  listeners.forEach(l => l())
}
function subscribe(cb: () => void) {
  listeners.add(cb)
  window.addEventListener('storage', cb)
  return () => { listeners.delete(cb); window.removeEventListener('storage', cb) }
}
function parse(raw: string): SnoozeMap {
  try { return JSON.parse(raw) as SnoozeMap } catch { return {} }
}

function isHidden(item: AttentionItem, s: Snooze | undefined, now: number): boolean {
  if (!s) return false
  if (s.until !== undefined && s.until > now) return true
  if (s.count !== undefined && item.count <= s.count) return true
  return false
}

/**
 * Cross-page "needs attention" signals, with per-item snooze/dismiss.
 * Shares react-query cache keys with the Forecast, Staff and CE pages (no extra
 * fetches once those load). Powers the dashboard strip and the sidebar badges.
 */
export function useAttention() {
  const { data: claims } = useClaims({ status: 'Pending' })
  const { data: staff } = useStaff()
  const { data: ce } = useCEStatus()
  const raw = useSyncExternalStore(subscribe, readRaw, () => '{}')
  const snoozes = useMemo(() => parse(raw), [raw])

  // Ticks each minute so timed snoozes expire without a reload.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const all = useMemo(() => {
    const items: AttentionItem[] = []
    const today = new Date(new Date().toDateString())

    if (claims) {
      const overdue = claims.filter(c => c.forecastWeek && !isArchived(c) && new Date(c.forecastWeek) < today).length
      if (overdue > 0) {
        items.push({ key: 'overdue', label: `${overdue} claim${overdue !== 1 ? 's' : ''} past forecast date`, count: overdue, to: '/forecast', level: 'danger' })
      }
    }

    if (staff) {
      let expired = 0
      let expiring = 0
      for (const m of staff) {
        if (!m.active || !m.licenseExpiration) continue
        const days = Math.floor((new Date(m.licenseExpiration).getTime() - today.getTime()) / DAY)
        if (days < 0) expired++
        else if (days <= LICENSE_WARNING_DAYS) expiring++
      }
      if (expired > 0) items.push({ key: 'license-expired', label: `${expired} expired license${expired !== 1 ? 's' : ''}`, count: expired, to: '/staff', level: 'danger' })
      if (expiring > 0) items.push({ key: 'license-expiring', label: `${expiring} license${expiring !== 1 ? 's' : ''} expiring within ${LICENSE_WARNING_DAYS} days`, count: expiring, to: '/staff', level: 'warning' })
    }

    if (ce) {
      const atRisk = ce.filter(r => r.status === 'At Risk').length
      const behind = ce.filter(r => r.status === 'Behind Pace').length
      if (atRisk > 0) items.push({ key: 'ce-risk', label: `${atRisk} clinician${atRisk !== 1 ? 's' : ''} at risk on CE`, count: atRisk, to: '/ce-tracker', level: 'danger' })
      if (behind > 0) items.push({ key: 'ce-behind', label: `${behind} clinician${behind !== 1 ? 's' : ''} behind pace on CE`, count: behind, to: '/ce-tracker', level: 'warning' })
    }
    return items
  }, [claims, staff, ce])

  const ready = Boolean(claims && staff && ce)

  // Housekeeping once all data is in: a "dismiss until it changes" entry should
  // follow the count down (so a later regrowth re-surfaces it) and be dropped
  // when the issue is gone entirely; expired timed snoozes are dropped too.
  useEffect(() => {
    if (!ready) return
    const now = Date.now()
    const byKey = new Map(all.map(i => [i.key, i]))
    let changed = false
    const next: SnoozeMap = {}
    for (const [key, s] of Object.entries(snoozes)) {
      const item = byKey.get(key)
      const timedActive = s.until !== undefined && s.until > now
      if (!item) { changed = true; continue }
      if (s.count !== undefined && !timedActive) {
        if (item.count < s.count) { next[key] = { count: item.count }; changed = true; continue }
      }
      if (s.until !== undefined && !timedActive && s.count === undefined) { changed = true; continue }
      next[key] = s
    }
    if (changed) writeSnoozes(next)
  }, [ready, all, snoozes])

  const { items, snoozed } = useMemo(() => {
    const visible: AttentionItem[] = []
    const hidden: SnoozedItem[] = []
    for (const i of all) {
      const s = snoozes[i.key]
      if (isHidden(i, s, now)) hidden.push({ ...i, snooze: s })
      else visible.push(i)
    }
    return { items: visible, snoozed: hidden }
  }, [all, snoozes, now])

  const snooze = useCallback((item: AttentionItem, mode: SnoozeMode) => {
    const cur = parse(readRaw())
    cur[item.key] = mode === 'changes' ? { count: item.count } : { until: Date.now() + (mode === '1d' ? DAY : 7 * DAY) }
    writeSnoozes(cur)
  }, [])

  const unsnooze = useCallback((key: string) => {
    const cur = parse(readRaw())
    delete cur[key]
    writeSnoozes(cur)
  }, [])

  // Per-route sidebar badge: only items that are currently visible.
  const byRoute = useMemo(() => {
    const out: Record<string, { count: number; level: 'warning' | 'danger' }> = {}
    for (const i of items) {
      const cur = out[i.to]
      out[i.to] = {
        count: (cur?.count ?? 0) + i.count,
        level: cur?.level === 'danger' || i.level === 'danger' ? 'danger' : 'warning',
      }
    }
    return out
  }, [items])

  return { items, snoozed, byRoute, snooze, unsnooze, ready }
}
