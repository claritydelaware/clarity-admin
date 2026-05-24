import { useState } from 'react'
import { Loader2, AlertCircle, Upload, ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react'
import { useOverhead, useSaveOverhead, useUpdateOverhead } from '../hooks/useOverhead'
import { api } from '../lib/api'
import { formatCurrency } from '../lib/utils'
import type { OverheadEntry, XeroImportPreview } from '../types'

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
          <p className="text-xs font-body text-muted mt-0.5">Parsed from Xero_Import tab</p>
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
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [editEntry, setEditEntry] = useState<OverheadEntry | null>(null)

  const handleImport = async () => {
    setImporting(true)
    setImportError(null)
    try {
      const result = await api.overhead.importFromSheet()
      setPreview(result)
    } catch (e) {
      setImportError((e as Error).message)
    } finally {
      setImporting(false)
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
        <h2 className="font-heading text-base font-semibold text-ink">Import from Xero</h2>
        <p className="text-sm font-body text-muted">
          Download the monthly P&amp;L from Xero, copy it into a tab named <code className="bg-gray-100 px-1 rounded">Xero_Import</code> in the Claim Tracking spreadsheet, then click Import below.
        </p>

        {importError && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-error font-body">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {importError}
          </div>
        )}

        {!preview && (
          <button
            onClick={handleImport}
            disabled={importing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal text-white text-sm font-body rounded hover:bg-teal-mid transition-colors disabled:opacity-60"
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {importing ? 'Reading…' : 'Read from Xero_Import tab'}
          </button>
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
                    No overhead entries yet. Import from Xero above.
                  </td>
                </tr>
              )}
              {displayedEntries.map(entry => (
                <tr key={entry.month} className="hover:bg-cream transition-colors">
                  <td className="px-5 py-3 font-medium text-ink">
                    {new Date(entry.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
