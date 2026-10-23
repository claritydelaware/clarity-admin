import type { ClaimStatus, Clinician } from '../types'

// Single source of truth for colors that must be real hex strings (ApexCharts,
// inline SVG). Mirrors the @theme tokens in index.css — change both together.

export const COLORS = {
  teal: '#254D54',
  tealMid: '#3A7078',
  tealPale: '#E8F1F2',
  gold: '#F6C54D',
  goldDark: '#C9922A',
  success: '#15803D',
  error: '#DC2626',
  warning: '#B45309',
  muted: '#6B7280',
  mutedLight: '#9CA3AF',
  border: '#E6E9EF',
} as const

export const CLINICIAN_COLORS: Record<Clinician, string> = {
  Shannon: '#254D54',
  Jen:     '#F6C54D',
  Emily:   '#2F76A8',
  Shana:   '#B4533C',
}

// Categorical order: adjacent series never share a hue family.
export const CHART_PALETTE = ['#254D54', '#F6C54D', '#2F76A8', '#B4533C', '#7E3FB8', '#15803D']

// ─── Claim status pills ─────────────────────────────────────────────────────
// bg is a CSS var (usable in style=), fg is the readable text color on it.
export const CLAIM_STATUS_STYLE: Record<ClaimStatus, { bg: string; fg: string }> = {
  'Pending':           { bg: 'var(--color-status-orange)', fg: 'var(--color-ink)' },
  'Payment Pending':   { bg: 'var(--color-status-teal)',   fg: '#fff' },
  'Payment Received':  { bg: 'var(--color-status-green)',  fg: '#fff' },
  'Finalized':         { bg: 'var(--color-status-gray)',   fg: '#fff' },
  'Denied':            { bg: 'var(--color-status-red)',    fg: '#fff' },
  'Deductible':        { bg: 'var(--color-status-blue)',   fg: '#fff' },
  'Sent to Secondary': { bg: 'var(--color-status-purple)', fg: '#fff' },
}

/** Readable text color for any status-ish background (var or hex). */
export function onColor(bg: string): string {
  return bg === 'var(--color-status-orange)' || bg.toLowerCase() === '#f6c54d' || bg.toLowerCase() === '#c4c4c4'
    ? 'var(--color-ink)'
    : '#fff'
}
