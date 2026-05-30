import type { Claim } from '../types'

export function isArchived(claim: Claim): boolean {
  if (claim.status === 'Denied') return true
  if (claim.status === 'Sent to Secondary') return true
  if (claim.status === 'Payment Received' && !!claim.paymentDateReceived) return true
  if (claim.status === 'Deductible' && !!claim.paymentDateReceived) return true
  return false
}

export function getSundayOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  return d
}

export function calculateStripeFees(clientAmount: number): number {
  if (clientAmount <= 0) return 0
  return Math.round((clientAmount * 0.029 + 0.3) * 100) / 100
}

export function getLagDays(claimDate: string, paymentDate: string): number {
  return Math.round(
    (new Date(paymentDate).getTime() - new Date(claimDate).getTime()) / 86400000
  )
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// Convert M/D/YYYY (Sheet format) → YYYY-MM-DD for <input type="date">
// Uses string manipulation to avoid UTC timezone shift from new Date().toISOString()
export function toInputDate(sheetDate: string): string {
  const parts = sheetDate.split('/')
  if (parts.length !== 3) return ''
  const [m, d, y] = parts
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

const PAYER_EXACT_COLORS: Record<string, string> = {
  'BCBS':           '#a4c2f4',
  'BCBS-MA':        '#c9daf8',
  'Aetna':          '#b4a7d6',
  'United':         '#f9cb9c',
  'UMR':            '#f9cb9c',
  'Meritain':       '#d5a6bd',
  'Health Options': '#a2c4c9',
  'Medicare':       '#b7e1cd',
}

export function getPayerStyle(payer: string): { backgroundColor: string; color: string } {
  if (PAYER_EXACT_COLORS[payer]) return { backgroundColor: PAYER_EXACT_COLORS[payer], color: '#1A1A1A' }
  if (payer.startsWith('United-')) return { backgroundColor: '#fce5cd', color: '#1A1A1A' }
  if (payer.startsWith('BCBS-')) return { backgroundColor: '#c9daf8', color: '#1A1A1A' }
  return { backgroundColor: '#E5E7EB', color: '#374151' }
}

// Download a 2D string array as a CSV file in the browser.
// Each cell is quoted and embedded quotes are escaped to handle commas in notes.
export function downloadCsv(rows: string[][], filename: string): void {
  const csv = rows
    .map(row => row.map(cell => `"${(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
