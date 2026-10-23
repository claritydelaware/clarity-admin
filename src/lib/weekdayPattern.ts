import type { Claim, Clinician } from '../types'
import { CLINICIANS } from '../types'

// Mirrors the Worker's session definition (clarity-admin-api isCountableSession):
// therapy/evaluation codes only, never add-ons (90785), screening/testing (96127/96136),
// or secondary-billing duplicates.
const SESSION_CODES = new Set(['90837', '90832', '90834', '90847', '90846', '90791'])

export const isCountableSession = (c: Claim) =>
  SESSION_CODES.has(c.serviceCode) && c.submissionMethod !== 'Secondary'

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

// Monday-first index (Mon=0 … Sun=6) from a JS Date's getDay() (Sun=0 … Sat=6).
const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7

export function parseSheetDate(s: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s?.trim() ?? '')
  if (!m) return null
  return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]))
}

export interface WeekdayRow {
  day: (typeof WEEKDAY_LABELS)[number]
  sessions: number
  share: number         // % of all sessions in the window
  occurrences: number   // calendar days of this weekday inside the window
  avgPerDay: number     // sessions ÷ occurrences
}

export interface WeekdayPattern {
  rows: WeekdayRow[]
  total: number
  monTueShare: number   // % of sessions that fall on Monday or Tuesday
}

export function computeWeekdayPattern(
  claims: Claim[],
  from: Date,
  to: Date,
  clinician?: Clinician,
): WeekdayPattern {
  const counts = new Array<number>(7).fill(0)
  const occurrences = new Array<number>(7).fill(0)

  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) occurrences[weekdayIndex(d)]++

  for (const c of claims) {
    if (!isCountableSession(c)) continue
    if (clinician && c.clinician !== clinician) continue
    const d = parseSheetDate(c.claimDate)
    if (!d || d < from || d > to) continue
    counts[weekdayIndex(d)]++
  }

  const total = counts.reduce((a, b) => a + b, 0)
  const rows: WeekdayRow[] = WEEKDAY_LABELS.map((day, i) => ({
    day,
    sessions: counts[i],
    share: total ? (counts[i] / total) * 100 : 0,
    occurrences: occurrences[i],
    avgPerDay: occurrences[i] ? counts[i] / occurrences[i] : 0,
  }))

  return { rows, total, monTueShare: rows[0].share + rows[1].share }
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const toISODate = iso

/** Plain-text summary (aggregate counts only, no client data) for pasting back to Claude. */
export function weekdaySummaryText(claims: Claim[], from: Date, to: Date, windowLabel: string): string {
  const all = computeWeekdayPattern(claims, from, to)
  const fmt = (p: WeekdayPattern) =>
    p.rows.map(r => `${r.day} ${r.sessions} (${r.share.toFixed(1)}%, ${r.avgPerDay.toFixed(1)}/day over ${r.occurrences} days)`).join('; ')
  const lines = [
    `Sessions by weekday (service date), ${windowLabel}: ${iso(from)} to ${iso(to)}`,
    `Counting: therapy and evaluation codes only (excludes 90785, 96127, 96136, secondary).`,
    `All clinicians, ${all.total} sessions, Mon+Tue = ${all.monTueShare.toFixed(1)}%:`,
    fmt(all),
    '',
    'By clinician (sessions Mon/Tue/Wed/Thu/Fri/Sat/Sun, Mon+Tue share):',
    ...CLINICIANS.map(cl => {
      const p = computeWeekdayPattern(claims, from, to, cl)
      return `${cl}: ${p.rows.map(r => r.sessions).join('/')} (total ${p.total}, Mon+Tue ${p.monTueShare.toFixed(1)}%)`
    }),
  ]
  return lines.join('\n')
}
