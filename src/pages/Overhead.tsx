import { useState } from 'react'
import * as XLSX from 'xlsx'
import { Loader2, AlertCircle, FileSpreadsheet, ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react'
import { useOverhead, useSaveOverhead, useUpdateOverhead } from '../hooks/useOverhead'
import { formatCurrency } from '../lib/utils'
import type { OverheadEntry, XeroImportPreview } from '../types'

// Discovered at build time from reporting/*.xlsx
const xlsxAssets = import.meta.glob('../../reporting/*.xlsx', { query: '?url', import: 'default', eager: true }) as Record<string, string>

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

function ImportBadge({ source }: { source: 'xero-import' | 'manual' }) {
  return (
    <span className={[
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-body',
      source === 'xero-import' ? 'bg-teal-pale text-teal' : 'bg-gray-100 text-muted',
    ].join(' ')}>
      {source === 'xero-import' ? 'Xero Import' : 'Manual'}
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
          <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-body">
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
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="text-xs font-body text-muted">{label}</div>
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
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm font-body">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase tracking-wide">Account</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase tracking-wide">Category</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preview.lineItems.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-ink">{item.account}</td>
                  <td className="px-4 py-2 text-muted capitalize">{item.category}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal text-white text-sm font-body rounded hover:bg-teal-mid transition-colors"
        >
          <Check size={14} />
          Confirm &amp; Save
        </button>
        <button
          onClick={onDiscard}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-muted text-sm font-body rounded hover:bg-gray-50 transition-colors"
        >
          <X size={14} />
          Discard
        </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="font-heading text-base font-semibold text-ink">
          Edit — {new Date(entry.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <label className="block">
          <span className="text-xs font-body font-medium text-muted uppercase tracking-wide">Payroll Expenses ($)</span>
          <input type="number" value={payroll} onChange={e => setPayroll(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-200 px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal" />
        </label>
        <label className="block">
          <span className="text-xs font-body font-medium text-muted uppercase tracking-wide">Operational Expenses ($)</span>
          <input type="number" value={operational} onChange={e => setOperational(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-200 px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal" />
        </label>
        <label className="block">
          <span className="text-xs font-body font-medium text-muted uppercase tracking-wide">Notes</span>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-200 px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal" />
        </label>
        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal text-white text-sm font-body rounded hover:bg-teal-mid transition-colors disabled:opacity-60">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save
          </button>
          <button onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-muted text-sm font-body rounded hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Overhead() {
  const { data: entries, isLoading, isError, error } = useOverhead()
  const { mutate: saveOverhead } = useSaveOverhead()

  const [preview, setPreview] = useState<XeroImportPreview | null>(null)
  const [importing, setImporting] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [editEntry, setEditEntry] = useState<OverheadEntry | null>(null)

  // Build sorted list of available P&L files from reporting/
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
      importSource: 'xero-import',
      notes: '',
    })
    setPreview(null)
  }

  const displayedEntries = entries
    ? (showAll ? entries : entries.slice(-6)).sort((a, b) => b.month.localeCompare(a.month))
    : []

  const existingMonths = new Set(entries?.map(e => e.month) ?? [])

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-xl font-semibold text-ink">Overhead</h1>

      {/* Import section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <h2 className="font-heading text-base font-semibold text-ink">Import from Xero</h2>
          <p className="text-sm font-body text-muted mt-1">
            Drop monthly P&amp;L files from Xero into the <code className="bg-gray-100 px-1 rounded">reporting/</code> folder, then click a month to import.
          </p>
        </div>

        {importError && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-error font-body">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {importError}
          </div>
        )}

        {!preview && (
          reportingFiles.length === 0 ? (
            <p className="text-sm font-body text-muted italic">No P&amp;L files found in <code className="bg-gray-100 px-1 rounded">reporting/</code>.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
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
                      ? 'border-gray-200 text-muted hover:bg-gray-50'
                      : 'border-gray-200 text-ink hover:border-teal/40 hover:bg-teal-pale/20',
                    importing === file.label ? 'opacity-60 cursor-wait' : '',
                  ].join(' ')}
                >
                  {importing === file.label
                    ? <Loader2 size={14} className="shrink-0 animate-spin text-teal" />
                    : <FileSpreadsheet size={14} className="shrink-0 text-teal" />
                  }
                  <span>{file.label}</span>
                </button>
                )
              })}
            </div>
          )
        )}

        {preview && (
          <PreviewPanel
            preview={preview}
            onConfirm={handleConfirm}
            onDiscard={() => setPreview(null)}
            existing={existingMonths.has(preview.month)}
          />
        )}
      </div>

      {/* History table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-ink">History</h2>
          {entries && entries.length > 6 && (
            <button
              onClick={() => setShowAll(x => !x)}
              className="text-sm font-body text-teal hover:text-teal-mid transition-colors"
            >
              {showAll ? 'Show less' : `Show all (${entries.length})`}
            </button>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12 text-muted">
            <Loader2 size={18} className="animate-spin mr-2" />
            <span className="text-sm font-body">Loading…</span>
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 px-5 py-4 text-sm text-error font-body">
            <AlertCircle size={16} />
            {(error as Error).message}
          </div>
        )}

        {entries && (
          <table className="w-full text-sm font-body">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Month</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Total Income</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Payroll</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Operational</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">Net Income</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Source</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide"></th>
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
                <tr key={entry.month} className="hover:bg-cream transition-colors">
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
                    <button
                      onClick={() => setEditEntry(entry)}
                      className="inline-flex items-center gap-1 text-xs text-teal hover:text-teal-mid transition-colors font-body"
                    >
                      <Edit2 size={12} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editEntry && <EditModal entry={editEntry} onClose={() => setEditEntry(null)} />}
    </div>
  )
}
