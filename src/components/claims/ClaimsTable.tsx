import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ChevronUp, ChevronDown, Loader2, X } from 'lucide-react'
import type { Claim } from '../../types'
import { SERVICE_CODES, SUBMISSION_METHODS } from '../../types'
import { formatCurrency, formatDate, toInputDate } from '../../lib/utils'
import Badge from '../ui/Badge'
import { useInlineEditClaim, type InlineEditField } from '../../hooks/useClaims'

const PAGE_SIZE = 50

interface Props {
  claims: Claim[]
  onStatusClick: (claim: Claim) => void
  compact?: boolean
}

type SortKey = 'claimDate' | 'clinician' | 'totalPayment'

// ─── INLINE EDIT CELL ────────────────────────────────────────────────────────

interface CellProps {
  claim: Claim
  field: InlineEditField
  displayValue: string
  rawValue: string | number
  inputType: 'text' | 'number' | 'select' | 'date'
  options?: readonly string[]
}

function InlineEditCell({ claim, field, displayValue, rawValue, inputType, options }: CellProps) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)
  const { mutateAsync } = useInlineEditClaim()

  const startEdit = useCallback(() => {
    setVal(typeof rawValue === 'number' ? String(rawValue) : rawValue)
    setErr(null)
    setEditing(true)
  }, [rawValue])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = useCallback(async (newVal: string) => {
    if (newVal === String(rawValue)) { setEditing(false); return }
    setSaving(true)
    setEditing(false)
    try {
      const parsed: string | number = inputType === 'number' ? parseFloat(newVal) || 0 : newVal
      await mutateAsync({ rowIndex: claim.rowIndex, field, value: parsed })
      setErr(null)
    } catch {
      setErr('Save failed')
      setTimeout(() => setErr(null), 3000)
    } finally {
      setSaving(false)
    }
  }, [rawValue, inputType, mutateAsync, claim.rowIndex, field])

  const cancel = useCallback(() => {
    setEditing(false)
    setErr(null)
  }, [])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  { e.preventDefault(); commit(val) }
    if (e.key === 'Escape') { e.preventDefault(); cancel() }
  }, [val, commit, cancel])

  if (saving) {
    return (
      <span className="flex items-center gap-1 text-muted">
        <Loader2 size={12} className="animate-spin shrink-0" />
        <span className="opacity-50">{displayValue}</span>
      </span>
    )
  }

  if (err) {
    return <span className="text-error text-xs">{err}</span>
  }

  if (!editing) {
    return (
      <span
        className="cursor-pointer hover:bg-teal-pale rounded px-1 -mx-1 transition-colors inline-block min-w-8"
        onClick={startEdit}
        title="Click to edit"
      >
        {displayValue || <span className="text-muted italic">—</span>}
      </span>
    )
  }

  if (inputType === 'select' && options) {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={e => commit(e.target.value)}
        onKeyDown={onKeyDown}
        className="text-sm font-body border border-teal rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-teal w-full"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={inputType}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={e => commit(e.target.value)}
      onKeyDown={onKeyDown}
      className="text-sm font-body border border-teal rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-teal w-full"
      step={inputType === 'number' ? '0.01' : undefined}
      min={inputType === 'number' ? '0' : undefined}
    />
  )
}

// ─── MOBILE INLINE EDIT MODAL ────────────────────────────────────────────────

interface MobileEditModalProps {
  claim: Claim
  field: InlineEditField
  label: string
  rawValue: string | number
  inputType: 'text' | 'number' | 'select' | 'date'
  options?: readonly string[]
  onClose: () => void
  onSaved: () => void
}

function MobileEditModal({ claim, field, label, rawValue, inputType, options, onClose, onSaved }: MobileEditModalProps) {
  const [val, setVal] = useState(typeof rawValue === 'number' ? String(rawValue) : rawValue)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const { mutateAsync } = useInlineEditClaim()

  async function save() {
    setSaving(true)
    try {
      const parsed: string | number = inputType === 'number' ? parseFloat(val) || 0 : val
      await mutateAsync({ rowIndex: claim.rowIndex, field, value: parsed })
      onSaved()
      onClose()
    } catch {
      setErr('Save failed')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-2xl p-5 pb-8 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-heading text-sm font-semibold text-ink">Edit {label}</p>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={16} /></button>
        </div>
        {inputType === 'select' && options ? (
          <select
            value={val}
            onChange={e => setVal(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal"
          >
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type={inputType}
            value={val}
            onChange={e => setVal(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal"
            step={inputType === 'number' ? '0.01' : undefined}
          />
        )}
        {err && <p className="text-xs text-error font-body">{err}</p>}
        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-teal text-white text-sm font-ui font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-ui text-ink"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN TABLE ───────────────────────────────────────────────────────────────

export default function ClaimsTable({ claims, onStatusClick, compact = false }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'claimDate', dir: 'desc',
  })
  const [page, setPage] = useState(1)
  const rowPy = compact ? 'py-1.5' : 'py-3'
  const cellText = compact ? 'text-xs' : 'text-sm'

  const sorted = [...claims].sort((a, b) => {
    let cmp = 0
    if (sort.key === 'claimDate') cmp = new Date(a.claimDate).getTime() - new Date(b.claimDate).getTime()
    if (sort.key === 'clinician') cmp = a.clinician.localeCompare(b.clinician)
    if (sort.key === 'totalPayment') cmp = a.totalPayment - b.totalPayment
    return sort.dir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = (key: SortKey) => {
    setPage(1)
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })
  }

  const SortIcon = ({ col }: { col: SortKey }) =>
    sort.key === col
      ? sort.dir === 'asc' ? <ChevronUp size={13} className="inline ml-0.5" /> : <ChevronDown size={13} className="inline ml-0.5" />
      : <ChevronDown size={13} className="inline ml-0.5 opacity-25" />

  const th = (label: string, col?: SortKey) => (
    <th
      className={[
        'px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap',
        col ? 'cursor-pointer select-none hover:text-ink' : '',
      ].join(' ')}
      onClick={col ? () => toggleSort(col) : undefined}
    >
      {label}{col && <SortIcon col={col} />}
    </th>
  )

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm font-body">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {th('Clinician', 'clinician')}
              {th('Payer')}
              {th('Date', 'claimDate')}
              {th('Code')}
              {th('Method')}
              {th('Status')}
              {th('Client')}
              {th('Insurance')}
              {th('Total', 'totalPayment')}
              {th('Notes')}
              {th('')}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-muted text-sm">
                  No claims match the current filters.
                </td>
              </tr>
            )}
            {paginated.map(claim => (
              <tr key={claim.rowIndex} className="hover:bg-cream transition-colors">
                <td className={`px-4 ${rowPy} font-medium text-ink ${cellText}`}>{claim.clinician}</td>
                <td className={`px-4 ${rowPy} text-muted ${cellText}`}>{claim.insurance}</td>
                <td className={`px-4 ${rowPy} text-muted whitespace-nowrap ${cellText}`}>{formatDate(claim.claimDate)}</td>
                <td className={`px-4 ${rowPy} font-mono text-xs text-ink`}>
                  <InlineEditCell
                    claim={claim}
                    field="serviceCode"
                    displayValue={claim.serviceCode}
                    rawValue={claim.serviceCode}
                    inputType="select"
                    options={SERVICE_CODES}
                  />
                </td>
                <td className={`px-4 ${rowPy} text-muted ${cellText}`}>
                  <InlineEditCell
                    claim={claim}
                    field="submissionMethod"
                    displayValue={claim.submissionMethod}
                    rawValue={claim.submissionMethod}
                    inputType="select"
                    options={SUBMISSION_METHODS}
                  />
                </td>
                <td className={`px-4 ${rowPy}`}>
                  <Badge status={claim.status} onClick={() => onStatusClick(claim)} />
                </td>
                <td className={`px-4 ${rowPy} text-right tabular-nums ${cellText}`}>
                  <InlineEditCell
                    claim={claim}
                    field="clientAmount"
                    displayValue={formatCurrency(claim.clientAmount)}
                    rawValue={claim.clientAmount}
                    inputType="number"
                  />
                </td>
                <td className={`px-4 ${rowPy} text-right tabular-nums ${cellText}`}>
                  <InlineEditCell
                    claim={claim}
                    field="insuranceAmount"
                    displayValue={formatCurrency(claim.insuranceAmount)}
                    rawValue={claim.insuranceAmount}
                    inputType="number"
                  />
                </td>
                <td className={`px-4 ${rowPy} text-right tabular-nums font-medium ${cellText}`}>{formatCurrency(claim.totalPayment)}</td>
                <td className={`px-4 ${rowPy} text-muted max-w-40 ${cellText}`}>
                  <InlineEditCell
                    claim={claim}
                    field="notes"
                    displayValue={claim.notes ?? ''}
                    rawValue={claim.notes ?? ''}
                    inputType="text"
                  />
                </td>
                <td className={`px-4 ${rowPy} text-right`}>
                  <Link
                    to={`/claims/${claim.rowIndex}/edit`}
                    className="text-xs text-teal hover:underline font-body"
                    onClick={e => e.stopPropagation()}
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {paginated.length === 0 && (
          <p className="text-center text-muted text-sm py-8">No claims match the current filters.</p>
        )}
        {paginated.map(claim => (
          <MobileCard key={claim.rowIndex} claim={claim} onStatusClick={onStatusClick} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm font-body text-muted">
          <span>{sorted.length} claims · page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MOBILE CARD ─────────────────────────────────────────────────────────────

function MobileCard({ claim, onStatusClick }: { claim: Claim; onStatusClick: (c: Claim) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [mobileEdit, setMobileEdit] = useState<{
    field: InlineEditField
    label: string
    rawValue: string | number
    inputType: 'text' | 'number' | 'select' | 'date'
    options?: readonly string[]
  } | null>(null)

  const editField = (
    field: InlineEditField,
    label: string,
    rawValue: string | number,
    inputType: 'text' | 'number' | 'select' | 'date',
    options?: readonly string[],
  ) => {
    setMobileEdit({ field, label, rawValue, inputType, options })
  }

  return (
    <>
      {mobileEdit && (
        <MobileEditModal
          claim={claim}
          field={mobileEdit.field}
          label={mobileEdit.label}
          rawValue={mobileEdit.rawValue}
          inputType={mobileEdit.inputType}
          options={mobileEdit.options}
          onClose={() => setMobileEdit(null)}
          onSaved={() => setMobileEdit(null)}
        />
      )}

      <div
        className="bg-white rounded-lg border border-gray-200 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-ink text-sm">{claim.clinician}</span>
            <span className="text-muted text-xs truncate">{claim.insurance}</span>
            <span className="text-muted text-xs whitespace-nowrap">{formatDate(claim.claimDate)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge status={claim.status} onClick={e => { e.stopPropagation(); onStatusClick(claim) }} />
            <span className="font-medium text-sm tabular-nums">{formatCurrency(claim.totalPayment)}</span>
          </div>
        </div>
        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted">
            <button
              className="text-left hover:text-teal transition-colors"
              onClick={e => { e.stopPropagation(); editField('serviceCode', 'Service Code', claim.serviceCode, 'select', SERVICE_CODES) }}
            >
              Code: <span className="font-mono text-ink">{claim.serviceCode}</span>
            </button>
            <button
              className="text-left hover:text-teal transition-colors"
              onClick={e => { e.stopPropagation(); editField('clientAmount', 'Client Amount', claim.clientAmount, 'number') }}
            >
              Client: <span className="text-ink">{formatCurrency(claim.clientAmount)}</span>
            </button>
            <button
              className="text-left hover:text-teal transition-colors"
              onClick={e => { e.stopPropagation(); editField('submissionMethod', 'Submission Method', claim.submissionMethod, 'select', SUBMISSION_METHODS) }}
            >
              Method: <span className="text-ink">{claim.submissionMethod}</span>
            </button>
            <button
              className="text-left hover:text-teal transition-colors"
              onClick={e => { e.stopPropagation(); editField('insuranceAmount', 'Insurance Amount', claim.insuranceAmount, 'number') }}
            >
              Insurance: <span className="text-ink">{formatCurrency(claim.insuranceAmount)}</span>
            </button>
            {claim.status === 'Payment Received' && (
              <button
                className="col-span-2 text-left hover:text-teal transition-colors"
                onClick={e => { e.stopPropagation(); editField('paymentDateReceived', 'Payment Date', toInputDate(claim.paymentDateReceived ?? ''), 'date') }}
              >
                Paid: <span className="text-ink">{claim.paymentDateReceived ?? '—'}</span>
              </button>
            )}
            <button
              className="col-span-2 text-left hover:text-teal transition-colors"
              onClick={e => { e.stopPropagation(); editField('notes', 'Notes', claim.notes ?? '', 'text') }}
            >
              {claim.notes ? <>Notes: <span className="text-ink">{claim.notes}</span></> : <span className="text-teal">+ Add notes</span>}
            </button>
            <span className="col-span-2 pt-1">
              <Link
                to={`/claims/${claim.rowIndex}/edit`}
                className="text-xs text-teal hover:underline font-body"
                onClick={e => e.stopPropagation()}
              >
                Full edit
              </Link>
            </span>
          </div>
        )}
      </div>
    </>
  )
}
