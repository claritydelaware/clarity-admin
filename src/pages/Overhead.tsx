import { useState } from 'react'
import * as XLSX from 'xlsx'
import { FileSpreadsheet, ChevronDown, ChevronUp, Edit2, DollarSign, ClipboardPaste } from 'lucide-react'
import { useOverhead, useSaveOverhead, useUpdateOverhead } from '../hooks/useOverhead'
import { usePayroll, useSavePayroll } from '../hooks/usePayroll'
import { formatCurrency } from '../lib/utils'
import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Dialog from '../components/ui/Dialog'
import ErrorBanner from '../components/ui/ErrorBanner'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import type { OverheadEntry, XeroImportPreview, PayrollEmployee } from '../types'

const xlsxAssets = import.meta.glob('../../reporting/*.xlsx', { query: '?url', import: 'default', eager: true }) as Record<string, string>
const csvAssets = import.meta.glob('../../reporting/*.csv', { query: '?url', import: 'default', eager: true }) as Record<string, string>

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const SKIP_LABELS = new Set([
  'Total Income', 'Gross Profit', 'Total Operating Expenses',
  'Operating Income', 'Total Other Income / (Expense)', 'Net Income',
  'Account', 'Income', 'Operating Expenses', 'Other Income / (Expense)',
  'Income Statement (Profit and Loss)',
])

const PAYROLL_ACCOUNTS = new Set([
  'Compensation -  Clinicians', 'Compensation -  Officers',
  'Payroll Taxes -  Clinicians', 'Payroll Taxes -  Officers',
])

interface ReportingFile {
  label: string
  url: string
  sortKey: number
}

function labelToMonthKey(label: string): string {
  const parts = label.split(' ')
  const monthIdx = MONTH_NAMES.findIndex(m => m === parts[0])
  if (monthIdx < 0 || !parts[1]) return ''
  return `${parts[1]}-${String(monthIdx + 1).padStart(2, '0')}-01`
}

function parseFilename(path: string): { label: string; sortKey: number } | null {
  const name = path.split('/').pop() ?? ''
  const m = name.match(/^(\w+)_(\d{4})_PL\.xlsx$/i)
  if (!m) return null
  const monthIdx = MONTH_NAMES.findIndex(mn => mn.toLowerCase() === m[1].toLowerCase())
  if (monthIdx < 0) return null
  const year = parseInt(m[2])
  return { label: `${MONTH_NAMES[monthIdx]} ${year}`, sortKey: year * 100 + monthIdx }
}

function parseXeroRows(rows: (string | number)[][]): XeroImportPreview | string {
  const periodRow = String(rows[2]?.[0] ?? '')
  const periodMatch = periodRow.match(/For the month ended (\w+)\s+\d+,?\s+(\d{4})/i)
  if (!periodMatch) return `Could not parse period from row 3: "${periodRow}"`

  const monthIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === periodMatch[1].toLowerCase())
  if (monthIdx < 0) return `Unknown month: ${periodMatch[1]}`
  const year = parseInt(periodMatch[2])
  const month = `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`
  const periodLabel = `${MONTH_NAMES[monthIdx]} ${year}`

  const lineItems: XeroImportPreview['lineItems'] = []
  let section: 'income' | 'expenses' | 'other' = 'income'

  for (let i = 4; i < rows.length; i++) {
    const account = String(rows[i]?.[0] ?? '').trim()
    const raw = rows[i]?.[1]
    if (!account) continue
    if (account === 'Operating Expenses') { section = 'expenses'; continue }
    if (account === 'Other Income / (Expense)') { section = 'other'; continue }
    if (account === 'Income' && i < 8) { section = 'income'; continue }
    if (SKIP_LABELS.has(account)) continue
    const amount = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(/[$,()]/g, ''))
    if (isNaN(amount)) continue
    let category: XeroImportPreview['lineItems'][0]['category']
    if (section === 'income') category = 'income'
    else if (section === 'other') category = 'other'
    else if (PAYROLL_ACCOUNTS.has(account)) category = 'payroll'
    else category = 'operational'
    lineItems.push({ account, amount, category })
  }

  const totalIncome = lineItems.filter(l => l.category === 'income').reduce((s, l) => s + l.amount, 0)
  const payrollExpenses = lineItems.filter(l => l.category === 'payroll').reduce((s, l) => s + l.amount, 0)
  const operationalExpenses = lineItems.filter(l => l.category === 'operational').reduce((s, l) => s + l.amount, 0)
  const otherIncome = lineItems.filter(l => l.category === 'other').reduce((s, l) => s + l.amount, 0)
  const totalExpenses = payrollExpenses + operationalExpenses
  const netIncome = totalIncome - totalExpenses + otherIncome

  return { month, periodLabel, totalIncome, payrollExpenses, operationalExpenses, totalExpenses, netIncome, lineItems }
}

// ─── GUSTO CSV PARSING ────────────────────────────────────────────────────────

interface GustoCsvFile {
  label: string
  url: string
  month: string
  sortKey: number
}

function parseGustoFilename(path: string): GustoCsvFile | null {
  const name = path.split('/').pop() ?? ''
  const m = name.match(/(\d{4})-(\d{2})-\d{2}-to-\d{4}-\d{2}-\d{2}\.csv$/i)
  if (!m) return null
  const year = parseInt(m[1])
  const monthNum = parseInt(m[2])
  const monthKey = `${year}-${String(monthNum).padStart(2, '0')}-01`
  const monthLabel = `${MONTH_NAMES[monthNum - 1]} ${year}`
  return { label: monthLabel, url: '', month: monthKey, sortKey: year * 100 + monthNum - 1 }
}

interface GustoPayrollPreview {
  month: string
  periodLabel: string
  grossEarnings: number
  employerTaxes: number
  totalPayrollCost: number
  partnerDistributions: number
  employeeCount: number
  breakdown: PayrollEmployee[]
  payRunCount: number
}

function parseGustoCsv(text: string, month: string, periodLabel: string): GustoPayrollPreview | string {
  const lines = text.split('\n').map(line => {
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === ',' && !inQuotes) { fields.push(current.trim()); current = ''; continue }
      current += ch
    }
    fields.push(current.trim())
    return fields
  })

  const employees = new Map<string, PayrollEmployee>()
  let colMap: Record<string, number> = {}
  let inSection = false
  let payRunCount = 0
  let totalDistributions = 0
  let currentEmployee: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const row = lines[i]

    if (!row[0] || row[0] === '') {
      if (inSection && currentEmployee) {
        const job = row[4] ?? ''
        const payType = row[5] ?? ''
        if (job !== 'Totals' && payType !== 'Gross') {
          const addlAmount = parseFloat(row[colMap.amount ?? 8]?.replace(/[$,]/g, '') ?? '') || 0
          if (addlAmount > 0) {
            const emp = employees.get(currentEmployee)
            if (emp) emp.grossEarnings += addlAmount
          }
        }
      }
      continue
    }

    if (row[0] === 'Last Name') {
      colMap = {}
      for (let j = 0; j < row.length; j++) {
        const h = row[j].toLowerCase()
        if (h === 'last name') colMap.lastName = j
        if (h === 'first name') colMap.firstName = j
        if (h === 'amount' || h === 'gross earnings') colMap.amount = j
        if (h === 'employer taxes') colMap.employerTaxes = j
        if (h === 'partner distribution') colMap.partnerDistribution = j
      }
      payRunCount++
      inSection = true
      currentEmployee = null
      continue
    }

    if (!inSection) continue
    if (row[0] === 'Payroll Totals') { inSection = false; currentEmployee = null; continue }

    const lastName = row[colMap.lastName ?? 0] ?? ''
    const firstName = row[colMap.firstName ?? 1] ?? ''
    if (!lastName) continue
    if (!(row[2] ?? '').trim()) continue

    const amount = parseFloat(row[colMap.amount ?? 2]?.replace(/[$,]/g, '') ?? '') || 0
    const eTaxes = parseFloat(row[colMap.employerTaxes ?? 4]?.replace(/[$,]/g, '') ?? '') || 0
    const dist = colMap.partnerDistribution != null
      ? (parseFloat(row[colMap.partnerDistribution]?.replace(/[$,]/g, '') ?? '') || 0)
      : 0

    const name = `${firstName} ${lastName}`.trim()
    currentEmployee = name
    const existing = employees.get(name) ?? { name, grossEarnings: 0, employerTaxes: 0, partnerDistribution: 0 }
    existing.grossEarnings += amount
    existing.employerTaxes += eTaxes
    existing.partnerDistribution += dist
    totalDistributions += dist
    employees.set(name, existing)
  }

  if (employees.size === 0) return 'No employee data found in CSV'

  const breakdown = [...employees.values()]
  const grossEarnings = Math.round(breakdown.reduce((s, e) => s + e.grossEarnings, 0) * 100) / 100
  const employerTaxes = Math.round(breakdown.reduce((s, e) => s + e.employerTaxes, 0) * 100) / 100

  return {
    month,
    periodLabel,
    grossEarnings,
    employerTaxes,
    totalPayrollCost: Math.round((grossEarnings + employerTaxes) * 100) / 100,
    partnerDistributions: Math.round(totalDistributions * 100) / 100,
    employeeCount: employees.size,
    breakdown,
    payRunCount,
  }
}

function PayrollPreviewPanel({ preview, onConfirm, onDiscard, existing }: {
  preview: GustoPayrollPreview
  onConfirm: () => void
  onDiscard: () => void
  existing: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl border border-teal/20 bg-teal-pale/30 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-heading text-base font-semibold text-ink">{preview.periodLabel}</h3>
          <p className="text-xs font-body text-muted mt-0.5">
            {preview.payRunCount} payroll run{preview.payRunCount !== 1 ? 's' : ''} · {preview.employeeCount} employee{preview.employeeCount !== 1 ? 's' : ''}
          </p>
        </div>
        {existing && (
          <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-ui">
            Will overwrite existing entry
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Gross Earnings', value: formatCurrency(preview.grossEarnings) },
          { label: 'Employer Taxes', value: formatCurrency(preview.employerTaxes) },
          { label: 'Total Payroll Cost', value: formatCurrency(preview.totalPayrollCost) },
          { label: 'Partner Distributions', value: formatCurrency(preview.partnerDistributions) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-lg border border-border p-3">
            <div className="text-xs font-ui text-muted">{label}</div>
            <div className="font-heading text-base font-semibold text-ink mt-0.5 tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setExpanded(x => !x)}
        className="flex items-center gap-1.5 text-sm font-body text-teal hover:text-teal-mid transition-colors"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Hide' : 'Show'} per-employee breakdown
      </button>

      {expanded && (
        <Card padding="none">
          <table className="w-full text-sm font-body">
            <thead className="bg-surface-sunken border-b border-border">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium font-ui text-muted uppercase tracking-wide">Employee</th>
                <th className="px-4 py-2 text-right text-xs font-medium font-ui text-muted uppercase tracking-wide">Gross</th>
                <th className="px-4 py-2 text-right text-xs font-medium font-ui text-muted uppercase tracking-wide">ER Taxes</th>
                <th className="px-4 py-2 text-right text-xs font-medium font-ui text-muted uppercase tracking-wide">Distributions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preview.breakdown.map(emp => (
                <tr key={emp.name} className="hover:bg-surface-sunken">
                  <td className="px-4 py-2 text-ink">{emp.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(emp.grossEarnings)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted">{formatCurrency(emp.employerTaxes)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted">{emp.partnerDistribution > 0 ? formatCurrency(emp.partnerDistribution) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="flex gap-3">
        <Button onClick={onConfirm}>Confirm &amp; Save</Button>
        <Button variant="secondary" onClick={onDiscard}>Discard</Button>
      </div>
    </div>
  )
}

function ImportBadge({ source }: { source: 'xero-import' | 'qbo-import' | 'manual' }) {
  const label = source === 'xero-import' ? 'Xero Import' : source === 'qbo-import' ? 'QBO Import' : 'Manual'
  return (
    <span className={[
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-ui',
      source !== 'manual' ? 'bg-teal-pale text-teal' : 'bg-gray-100 text-muted',
    ].join(' ')}>
      {label}
    </span>
  )
}

function PreviewPanel({ preview, onConfirm, onDiscard, existing }: {
  preview: XeroImportPreview
  onConfirm: () => void
  onDiscard: () => void
  existing: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl border border-teal/20 bg-teal-pale/30 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-heading text-base font-semibold text-ink">{preview.periodLabel}</h3>
          <p className="text-xs font-body text-muted mt-0.5">Parsed from Xero P&amp;L export</p>
        </div>
        {existing && (
          <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-ui">
            Will overwrite existing entry
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Income', value: formatCurrency(preview.totalIncome) },
          { label: 'Payroll Expenses', value: formatCurrency(preview.payrollExpenses) },
          { label: 'Operational Expenses', value: formatCurrency(preview.operationalExpenses) },
          { label: 'Net Income', value: formatCurrency(preview.netIncome) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-lg border border-border p-3">
            <div className="text-xs font-ui text-muted">{label}</div>
            <div className="font-heading text-base font-semibold text-ink mt-0.5 tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setExpanded(x => !x)}
        className="flex items-center gap-1.5 text-sm font-body text-teal hover:text-teal-mid transition-colors"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Hide' : 'Show'} line items ({preview.lineItems.length})
      </button>

      {expanded && (
        <Card padding="none">
          <table className="w-full text-sm font-body">
            <thead className="bg-surface-sunken border-b border-border">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium font-ui text-muted uppercase tracking-wide">Account</th>
                <th className="px-4 py-2 text-left text-xs font-medium font-ui text-muted uppercase tracking-wide">Category</th>
                <th className="px-4 py-2 text-right text-xs font-medium font-ui text-muted uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preview.lineItems.map((item, i) => (
                <tr key={i} className="hover:bg-surface-sunken">
                  <td className="px-4 py-2 text-ink">{item.account}</td>
                  <td className="px-4 py-2 text-muted capitalize">{item.category}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="flex gap-3">
        <Button onClick={onConfirm}>Confirm &amp; Save</Button>
        <Button variant="secondary" onClick={onDiscard}>Discard</Button>
      </div>
    </div>
  )
}

function EditModal({ entry, onClose }: { entry: OverheadEntry; onClose: () => void }) {
  const { mutate: update, isPending } = useUpdateOverhead()
  const [payroll, setPayroll] = useState(String(entry.payrollExpenses))
  const [operational, setOperational] = useState(String(entry.operationalExpenses))
  const [notes, setNotes] = useState(entry.notes)

  const handleSave = () => {
    const payrollExpenses = parseFloat(payroll) || 0
    const operationalExpenses = parseFloat(operational) || 0
    update({
      month: entry.month,
      data: {
        payrollExpenses, operationalExpenses,
        totalExpenses: payrollExpenses + operationalExpenses,
        notes,
        importSource: 'manual',
      },
    })
    onClose()
  }

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title={`Edit — ${new Date(entry.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
    >
      <div className="space-y-4">
        <Input
          label="Payroll Expenses ($)"
          type="number"
          value={payroll}
          onChange={e => setPayroll(e.target.value)}
        />
        <Input
          label="Operational Expenses ($)"
          type="number"
          value={operational}
          onChange={e => setOperational(e.target.value)}
        />
        <Input
          label="Notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} loading={isPending}>Save</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Dialog>
  )
}

export default function Overhead() {
  const { data: entries, isLoading, isError, error } = useOverhead()
  const { mutate: saveOverhead } = useSaveOverhead()
  const { data: payrollEntries, isLoading: payrollLoading } = usePayroll()
  const { mutate: savePayroll } = useSavePayroll()

  const [preview, setPreview] = useState<XeroImportPreview | null>(null)
  const [importing, setImporting] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [editEntry, setEditEntry] = useState<OverheadEntry | null>(null)
  const [pasteXeroOpen, setPasteXeroOpen] = useState(false)
  const [pasteXeroText, setPasteXeroText] = useState('')
  const [pasteXeroError, setPasteXeroError] = useState<string | null>(null)

  const [payrollPreview, setPayrollPreview] = useState<GustoPayrollPreview | null>(null)
  const [payrollImporting, setPayrollImporting] = useState<string | null>(null)
  const [payrollImportError, setPayrollImportError] = useState<string | null>(null)
  const [showAllPayroll, setShowAllPayroll] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)

  const reportingFiles: ReportingFile[] = Object.entries(xlsxAssets)
    .map(([path, url]) => {
      const parsed = parseFilename(path)
      if (!parsed) return null
      return { label: parsed.label, url, sortKey: parsed.sortKey }
    })
    .filter((f): f is ReportingFile => f !== null)
    .sort((a, b) => b.sortKey - a.sortKey)

  const handleImport = async (file: ReportingFile) => {
    setImporting(file.label)
    setImportError(null)
    try {
      const resp = await fetch(file.url)
      const buf = await resp.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: '' })
      const result = parseXeroRows(rows)
      if (typeof result === 'string') {
        setImportError(result)
      } else {
        setPreview(result)
      }
    } catch (e) {
      setImportError((e as Error).message)
    } finally {
      setImporting(null)
    }
  }

  const handleConfirm = () => {
    if (!preview) return
    saveOverhead({
      month: preview.month,
      totalIncome: preview.totalIncome,
      payrollExpenses: preview.payrollExpenses,
      operationalExpenses: preview.operationalExpenses,
      totalExpenses: preview.totalExpenses,
      netIncome: preview.netIncome,
      lineItems: preview.lineItems,
      importSource: preview.importSource ?? 'xero-import',
      notes: '',
    })
    setPreview(null)
  }

  const handlePasteXeroImport = () => {
    setPasteXeroError(null)
    try {
      const data = JSON.parse(pasteXeroText.trim()) as XeroImportPreview & { otherIncome?: number }
      if (!data.month || data.totalIncome == null) {
        setPasteXeroError('JSON must include at least "month" and "totalIncome" fields')
        return
      }
      // Normalize month to the canonical YYYY-MM-01 join key every downstream
      // aggregate (quarterly summary, valuation snapshot, caseload trends) looks
      // up by exact string match — a period-end date or ISO timestamp would
      // otherwise silently fail those lookups.
      const parsedMonth = new Date(data.month)
      if (isNaN(parsedMonth.getTime())) {
        setPasteXeroError(`Could not parse "month" as a date: "${data.month}"`)
        return
      }
      data.month = `${parsedMonth.getUTCFullYear()}-${String(parsedMonth.getUTCMonth() + 1).padStart(2, '0')}-01`
      if (!data.periodLabel) data.periodLabel = new Date(data.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      if (!Array.isArray(data.lineItems)) data.lineItems = []
      if (data.payrollExpenses == null) data.payrollExpenses = 0
      if (data.operationalExpenses == null) data.operationalExpenses = 0
      if (data.totalExpenses == null) data.totalExpenses = Math.round((data.payrollExpenses + data.operationalExpenses) * 100) / 100
      // Matches parseXeroRows' formula (totalIncome - totalExpenses + otherIncome) —
      // omitting otherIncome here would silently understate netIncome for any
      // period with a non-zero Other Income/(Expense) line.
      if (data.netIncome == null) data.netIncome = Math.round((data.totalIncome - data.totalExpenses + (data.otherIncome ?? 0)) * 100) / 100
      setPreview(data)
      setPasteXeroOpen(false)
      setPasteXeroText('')
    } catch {
      setPasteXeroError('Invalid JSON — paste the block provided by Claude')
    }
  }

  // ─── Gusto payroll CSV files ─────────────────────────────────────────────────
  const payrollFiles: GustoCsvFile[] = Object.entries(csvAssets)
    .map(([path, url]) => {
      const parsed = parseGustoFilename(path)
      if (!parsed) return null
      return { ...parsed, url }
    })
    .filter((f): f is GustoCsvFile => f !== null)
    .sort((a, b) => b.sortKey - a.sortKey)

  const handlePayrollImport = async (file: GustoCsvFile) => {
    setPayrollImporting(file.label)
    setPayrollImportError(null)
    try {
      const resp = await fetch(file.url)
      const text = await resp.text()
      const result = parseGustoCsv(text, file.month, file.label)
      if (typeof result === 'string') {
        setPayrollImportError(result)
      } else {
        setPayrollPreview(result)
      }
    } catch (e) {
      setPayrollImportError((e as Error).message)
    } finally {
      setPayrollImporting(null)
    }
  }

  const handlePayrollConfirm = () => {
    if (!payrollPreview) return
    savePayroll({
      month: payrollPreview.month,
      grossEarnings: payrollPreview.grossEarnings,
      employerTaxes: payrollPreview.employerTaxes,
      totalPayrollCost: payrollPreview.totalPayrollCost,
      partnerDistributions: payrollPreview.partnerDistributions,
      employeeCount: payrollPreview.employeeCount,
      breakdown: payrollPreview.breakdown,
      importSource: 'gusto-import',
      notes: '',
    })
    setPayrollPreview(null)
  }

  const handlePasteImport = () => {
    setPasteError(null)
    try {
      const data = JSON.parse(pasteText.trim()) as GustoPayrollPreview
      if (!data.month || !data.grossEarnings) {
        setPasteError('JSON must include at least "month" and "grossEarnings" fields')
        return
      }
      if (!data.periodLabel) data.periodLabel = new Date(data.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      if (!data.breakdown) data.breakdown = []
      if (!data.employeeCount) data.employeeCount = data.breakdown.length
      if (!data.totalPayrollCost) data.totalPayrollCost = Math.round((data.grossEarnings + (data.employerTaxes ?? 0)) * 100) / 100
      if (!data.payRunCount) data.payRunCount = 1
      setPayrollPreview(data)
      setPasteOpen(false)
      setPasteText('')
    } catch {
      setPasteError('Invalid JSON — paste the block provided by Claude')
    }
  }

  const existingPayrollMonths = new Set(payrollEntries?.map(e => e.month) ?? [])
  const displayedPayroll = payrollEntries
    ? (showAllPayroll ? payrollEntries : payrollEntries.slice(-6)).sort((a, b) => b.month.localeCompare(a.month))
    : []

  const displayedEntries = entries
    ? (showAll ? entries : entries.slice(-6)).sort((a, b) => b.month.localeCompare(a.month))
    : []

  const existingMonths = new Set(entries?.map(e => e.month) ?? [])

  return (
    <div className="space-y-6">
      <PageHeader title="Overhead" />

      {/* Import section */}
      <Card title="Import Financials" subtitle="Ask Claude to pull a period's P&L from QuickBooks (or Xero) and paste the JSON, or drop monthly P&L files into the reporting/ folder.">
        {importError && <ErrorBanner message={importError} className="mb-4" />}

        {!preview && (
          <div className="space-y-3">
            <Button
              variant="secondary"
              icon={<ClipboardPaste size={14} />}
              onClick={() => { setPasteXeroOpen(true); setPasteXeroError(null) }}
            >
              Paste Financial Data
            </Button>

            {reportingFiles.length > 0 ? (
              <details className="group">
                <summary className="text-xs font-ui text-muted cursor-pointer hover:text-teal transition-colors">
                  Or import from P&amp;L files ({reportingFiles.length} available)
                </summary>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                  {reportingFiles.map(file => {
                    const alreadyImported = existingMonths.has(labelToMonthKey(file.label))
                    return (
                      <button
                        key={file.url}
                        onClick={() => handleImport(file)}
                        disabled={importing !== null}
                        className={[
                          'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left text-sm font-body transition-colors',
                          alreadyImported
                            ? 'border-border text-muted hover:bg-surface-sunken'
                            : 'border-border text-ink hover:border-teal/40 hover:bg-teal-pale/20',
                          importing === file.label ? 'opacity-60 cursor-wait' : '',
                        ].join(' ')}
                      >
                        <FileSpreadsheet size={14} className="shrink-0 text-teal" />
                        <span>{file.label}</span>
                      </button>
                    )
                  })}
                </div>
              </details>
            ) : (
              <p className="text-xs font-ui text-muted">No P&amp;L files found in <code className="bg-gray-100 px-1 rounded">reporting/</code>.</p>
            )}
          </div>
        )}

        {preview && (
          <PreviewPanel
            preview={preview}
            onConfirm={handleConfirm}
            onDiscard={() => setPreview(null)}
            existing={existingMonths.has(preview.month)}
          />
        )}
      </Card>

      <Dialog open={pasteXeroOpen} onClose={() => setPasteXeroOpen(false)} title="Paste P&L JSON" maxWidth="lg">
        <div className="space-y-3">
          <p className="text-xs font-body text-muted">
            Ask Claude: <span className="font-medium text-ink">"Pull QuickBooks P&amp;L for [month]"</span> — then paste the JSON block here.
          </p>
          {pasteXeroError && <ErrorBanner message={pasteXeroError} />}
          <textarea
            value={pasteXeroText}
            onChange={e => setPasteXeroText(e.target.value)}
            placeholder='{"month":"2026-06-01","periodLabel":"June 2026","totalIncome":50000,"payrollExpenses":20000,"operationalExpenses":8000,"otherIncome":0,"importSource":"qbo-import",...}'
            rows={12}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono text-ink bg-surface-sunken focus:outline-none focus:ring-2 focus:ring-teal resize-y"
          />
          <div className="flex gap-3">
            <Button onClick={handlePasteXeroImport} disabled={!pasteXeroText.trim()}>Import</Button>
            <Button variant="secondary" onClick={() => { setPasteXeroOpen(false); setPasteXeroText('') }}>Cancel</Button>
          </div>
        </div>
      </Dialog>

      {/* History table */}
      <Card
        title="History"
        actions={entries && entries.length > 6 ? (
          <Button variant="ghost" size="sm" onClick={() => setShowAll(x => !x)}>
            {showAll ? 'Show less' : `Show all (${entries.length})`}
          </Button>
        ) : undefined}
        padding="none"
      >
        {isLoading && <LoadingSpinner label="Loading…" />}
        {isError && <ErrorBanner message={(error as Error).message} className="m-4" />}

        {entries && (
          <div className="overflow-x-auto">
          <table className="w-full text-sm font-body min-w-[700px]">
            <thead className="bg-surface-sunken border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium font-ui text-muted uppercase tracking-wide">Month</th>
                <th className="px-4 py-3 text-right text-xs font-medium font-ui text-muted uppercase tracking-wide">Total Income</th>
                <th className="px-4 py-3 text-right text-xs font-medium font-ui text-muted uppercase tracking-wide">Payroll</th>
                <th className="px-4 py-3 text-right text-xs font-medium font-ui text-muted uppercase tracking-wide">Operational</th>
                <th className="px-4 py-3 text-right text-xs font-medium font-ui text-muted uppercase tracking-wide">Net Income</th>
                <th className="px-4 py-3 text-left text-xs font-medium font-ui text-muted uppercase tracking-wide">Source</th>
                <th className="px-4 py-3 text-right text-xs font-medium font-ui text-muted uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedEntries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted text-sm">
                    No overhead entries yet. Import a month above.
                  </td>
                </tr>
              )}
              {displayedEntries.map(entry => (
                <tr key={entry.month} className="hover:bg-surface-sunken transition-colors">
                  <td className="px-5 py-3 font-medium text-ink">
                    {new Date(entry.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(entry.totalIncome)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{formatCurrency(entry.payrollExpenses)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{formatCurrency(entry.operationalExpenses)}</td>
                  <td className={[
                    'px-4 py-3 text-right tabular-nums font-medium',
                    entry.netIncome >= 0 ? 'text-success' : 'text-error',
                  ].join(' ')}>{formatCurrency(entry.netIncome)}</td>
                  <td className="px-4 py-3"><ImportBadge source={entry.importSource} /></td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" icon={<Edit2 size={12} />} onClick={() => setEditEntry(entry)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      {/* ─── Payroll Import (Gusto) ───────────────────────────────────────── */}
      <Card title="Import Payroll from Gusto" subtitle="Ask Claude to pull Gusto payroll data, then paste the JSON here.">
        {payrollImportError && <ErrorBanner message={payrollImportError} className="mb-4" />}

        {!payrollPreview && (
          <div className="space-y-3">
            <Button
              variant="secondary"
              icon={<ClipboardPaste size={14} />}
              onClick={() => { setPasteOpen(true); setPasteError(null) }}
            >
              Paste Gusto Data
            </Button>

            {payrollFiles.length > 0 && (
              <details className="group">
                <summary className="text-xs font-ui text-muted cursor-pointer hover:text-teal transition-colors">
                  Or import from CSV files ({payrollFiles.length} available)
                </summary>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                  {payrollFiles.map(file => {
                    const alreadyImported = existingPayrollMonths.has(file.month)
                    return (
                      <button
                        key={file.url}
                        onClick={() => handlePayrollImport(file)}
                        disabled={payrollImporting !== null}
                        className={[
                          'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left text-sm font-body transition-colors',
                          alreadyImported
                            ? 'border-border text-muted hover:bg-surface-sunken'
                            : 'border-border text-ink hover:border-teal/40 hover:bg-teal-pale/20',
                          payrollImporting === file.label ? 'opacity-60 cursor-wait' : '',
                        ].join(' ')}
                      >
                        <DollarSign size={14} className="shrink-0 text-teal" />
                        <span>{file.label}</span>
                      </button>
                    )
                  })}
                </div>
              </details>
            )}
          </div>
        )}

        {payrollPreview && (
          <PayrollPreviewPanel
            preview={payrollPreview}
            onConfirm={handlePayrollConfirm}
            onDiscard={() => setPayrollPreview(null)}
            existing={existingPayrollMonths.has(payrollPreview.month)}
          />
        )}
      </Card>

      <Dialog open={pasteOpen} onClose={() => setPasteOpen(false)} title="Paste Gusto Payroll JSON" maxWidth="lg">
        <div className="space-y-3">
          <p className="text-xs font-body text-muted">
            Ask Claude: <span className="font-medium text-ink">"Pull Gusto payroll for [month]"</span> — then paste the JSON block here.
          </p>
          {pasteError && <ErrorBanner message={pasteError} />}
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder='{"month":"2026-06-01","periodLabel":"June 2026",...}'
            rows={12}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono text-ink bg-surface-sunken focus:outline-none focus:ring-2 focus:ring-teal resize-y"
          />
          <div className="flex gap-3">
            <Button onClick={handlePasteImport} disabled={!pasteText.trim()}>Import</Button>
            <Button variant="secondary" onClick={() => { setPasteOpen(false); setPasteText('') }}>Cancel</Button>
          </div>
        </div>
      </Dialog>

      {/* Payroll History */}
      <Card
        title="Payroll History"
        actions={payrollEntries && payrollEntries.length > 6 ? (
          <Button variant="ghost" size="sm" onClick={() => setShowAllPayroll(x => !x)}>
            {showAllPayroll ? 'Show less' : `Show all (${payrollEntries.length})`}
          </Button>
        ) : undefined}
        padding="none"
      >
        {payrollLoading && <LoadingSpinner label="Loading…" />}

        {payrollEntries && (
          <div className="overflow-x-auto">
          <table className="w-full text-sm font-body min-w-[600px]">
            <thead className="bg-surface-sunken border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium font-ui text-muted uppercase tracking-wide">Month</th>
                <th className="px-4 py-3 text-right text-xs font-medium font-ui text-muted uppercase tracking-wide">Gross Earnings</th>
                <th className="px-4 py-3 text-right text-xs font-medium font-ui text-muted uppercase tracking-wide">ER Taxes</th>
                <th className="px-4 py-3 text-right text-xs font-medium font-ui text-muted uppercase tracking-wide">Total Cost</th>
                <th className="px-4 py-3 text-right text-xs font-medium font-ui text-muted uppercase tracking-wide">Distributions</th>
                <th className="px-4 py-3 text-center text-xs font-medium font-ui text-muted uppercase tracking-wide">Employees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedPayroll.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted text-sm">
                    No payroll entries yet. Import a month above.
                  </td>
                </tr>
              )}
              {displayedPayroll.map(entry => (
                <tr key={entry.month} className="hover:bg-surface-sunken transition-colors">
                  <td className="px-5 py-3 font-medium text-ink">
                    {new Date(entry.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(entry.grossEarnings)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{formatCurrency(entry.employerTaxes)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(entry.totalPayrollCost)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{entry.partnerDistributions > 0 ? formatCurrency(entry.partnerDistributions) : '—'}</td>
                  <td className="px-4 py-3 text-center">{entry.employeeCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      {editEntry && <EditModal entry={editEntry} onClose={() => setEditEntry(null)} />}
    </div>
  )
}
