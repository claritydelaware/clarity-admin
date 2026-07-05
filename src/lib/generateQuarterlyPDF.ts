import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import type { QuarterProjection, PayerPerformance } from '../types'
import { formatCurrency } from './utils'

// Brand tokens from src/index.css — keep in sync, do not invent new colors.
const TEAL: [number, number, number] = [37, 77, 84]
const TEAL_MID: [number, number, number] = [58, 112, 120]
const GOLD: [number, number, number] = [246, 197, 77]
const INK: [number, number, number] = [26, 26, 26]
const MUTED: [number, number, number] = [107, 114, 128]
const BORDER: [number, number, number] = [230, 233, 239]

export interface QuarterlyPDFData {
  quarterLabel: string
  revenue: number
  income: number
  totalOverhead: number
  profit: number
  marginPct: number | null
  sessions: number | null
  byClinicianRevenue: Record<string, number> | null
  projection: QuarterProjection
  payerPerformance: PayerPerformance[]
}

function money(n: number): string {
  return formatCurrency(n)
}

export function generateQuarterlyPDF(data: QuarterlyPDFData): void {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 48
  let y = 0

  // ─── Header band ────────────────────────────────────────────────────────
  doc.setFillColor(...TEAL)
  doc.rect(0, 0, pageWidth, 86, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(0, 86, pageWidth, 3, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Clarity Counseling of Delaware', marginX, 36)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(`Quarterly Performance — ${data.quarterLabel}`, marginX, 58)

  doc.setFontSize(9)
  doc.setTextColor(232, 241, 242)
  doc.text(`Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, marginX, 74)

  y = 116

  // ─── Headline metrics ───────────────────────────────────────────────────
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Summary', marginX, y)
  y += 14

  const metrics: [string, string][] = [
    ['Revenue', money(data.revenue)],
    ['Income', money(data.income)],
    ['Overhead', money(data.totalOverhead)],
    ['Profit', money(data.profit)],
    ['Margin', data.marginPct != null ? `${Math.round(data.marginPct * 100)}%` : '—'],
    ['Sessions', data.sessions != null ? String(data.sessions) : '—'],
  ]

  const cardWidth = (pageWidth - marginX * 2 - 5 * 10) / 6
  metrics.forEach(([label, value], i) => {
    const x = marginX + i * (cardWidth + 10)
    doc.setDrawColor(...BORDER)
    doc.roundedRect(x, y, cardWidth, 46, 4, 4, 'S')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text(label.toUpperCase(), x + 8, y + 15)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...INK)
    doc.text(value, x + 8, y + 34, { maxWidth: cardWidth - 16 })
  })
  y += 46 + 28

  // ─── Revenue by clinician ───────────────────────────────────────────────
  if (data.byClinicianRevenue) {
    const rows = Object.entries(data.byClinicianRevenue)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([clinician, revenue]) => [clinician, money(revenue)])

    if (rows.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...INK)
      doc.text('Revenue by Clinician', marginX, y)
      y += 8

      autoTable(doc, {
        startY: y,
        margin: { left: marginX, right: marginX },
        head: [['Clinician', 'Revenue']],
        body: rows,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 9, textColor: INK, lineColor: BORDER, lineWidth: 0.5 },
        headStyles: { fillColor: TEAL, textColor: 255, fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' } },
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 28
    }
  }

  // ─── Quarter projection ─────────────────────────────────────────────────
  const proj = data.projection
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...INK)
  doc.text(`${proj.quarterLabel} Full Quarter Projection`, marginX, y)
  y += 8

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['', 'Revenue', 'Income', 'Overhead', 'Profit']],
    body: [
      ['Actuals to date', money(proj.actualRevenue), money(proj.actualIncome), money(proj.actualOverhead), money(proj.actualProfit)],
      ['Projected remaining', money(proj.projectedRemainingRevenue), money(proj.projectedRemainingIncome), money(proj.projectedRemainingOverhead), money(proj.projectedRemainingProfit)],
      ['Total projection', money(proj.projectedTotalRevenue), money(proj.projectedTotalIncome), money(proj.projectedTotalOverhead), money(proj.projectedTotalProfit)],
    ],
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, textColor: INK, lineColor: BORDER, lineWidth: 0.5 },
    headStyles: { fillColor: TEAL_MID, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    bodyStyles: {},
    didParseCell(hook) {
      if (hook.row.index === 2 && hook.section === 'body') {
        hook.cell.styles.fontStyle = 'bold'
        hook.cell.styles.fillColor = [232, 241, 242]
      }
    },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 28

  // ─── Payer performance ──────────────────────────────────────────────────
  if (data.payerPerformance.length > 0) {
    if (y > 620) { doc.addPage(); y = 48 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...INK)
    doc.text('Payer Performance', marginX, y)
    y += 8

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Payer', 'Claims', 'Avg Days to Pay', 'Collection Rate', 'Pending']],
      body: data.payerPerformance.slice(0, 12).map(p => [
        p.payer,
        String(p.totalClaims),
        p.avgDaysToPay != null ? String(p.avgDaysToPay) : '—',
        p.collectionRate != null ? `${Math.round(p.collectionRate * 100)}%` : '—',
        String(p.pendingCount),
      ]),
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9, textColor: INK, lineColor: BORDER, lineWidth: 0.5 },
      headStyles: { fillColor: TEAL, textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    })
  }

  const filename = `clarity-${data.quarterLabel.toLowerCase().replace(/\s+/g, '-')}.pdf`
  doc.save(filename)
}
