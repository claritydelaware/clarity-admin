import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ChevronUp, ChevronDown, Loader2, X, ExternalLink, RotateCcw, Copy, Check, SlidersHorizontal, GripVertical } from 'lucide-react'
import type { Claim, ClaimStatus } from '../../types'
import { SERVICE_CODES, SUBMISSION_METHODS } from '../../types'
import { formatCurrency, formatDate, toInputDate } from '../../lib/utils'
import Badge, { PayerBadge } from '../ui/Badge'
import Tooltip from '../ui/Tooltip'
import BulkUpdateModal from './BulkUpdateModal'
import { useInlineEditClaim, useBulkUpdateClaims, type InlineEditField } from '../../hooks/useClaims'

const PAGE_SIZE = 50

const COPIED_STORAGE_KEY = 'clarity-copied-claim-ids'

function initCopiedIds(): Set<number> {
  try {
    const stored = sessionStorage.getItem(COPIED_STORAGE_KEY)
    if (stored) return new Set(JSON.parse(stored) as number[])
  } catch {}
  return new Set()
}

function persistCopiedIds(ids: Set<number>) {
  try { sessionStorage.setItem(COPIED_STORAGE_KEY, JSON.stringify([...ids])) } catch {}
}

type ColumnKey =
  | 'claimId' | 'clientId' | 'clinician' | 'insurance' | 'claimDate'
  | 'serviceCode' | 'submissionMethod' | 'status' | 'clientAmount'
  | 'insuranceAmount' | 'totalPayment' | 'notes'
  | 'paymentDateReceived' | 'lagDays' | 'trueClientAmount' | 'stripeFees'
  | 'payPeriod' | 'insurancePaidHHO' | 'overUnderHHO'

type SortKey =
  | 'claimDate'
  | 'paymentDateReceived'
  | 'forecastPaymentDate'
  | 'status'
  | 'insurance'
  | 'clinician'
  | 'serviceCode'
  | 'submissionMethod'
  | 'totalPayment'
  | 'insuranceAmount'
  | 'clientAmount'
  | 'lagDays'
  | 'trueClientAmount'
  | 'stripeFees'
  | 'insurancePaidHHO'
  | 'overUnderHHO'

// Sheet-aligned column order (B→Y). defaultVisible flags unchanged from v1.
const COLUMN_DEFS: { key: ColumnKey; label: string; defaultVisible: boolean; sortKey?: SortKey }[] = [
  { key: 'claimId',             label: 'Claim ID',         defaultVisible: true                              },
  { key: 'clientId',            label: 'Client ID',        defaultVisible: true                              },
  { key: 'clinician',           label: 'Clinician',        defaultVisible: true,  sortKey: 'clinician'       },
  { key: 'insurance',           label: 'Payer',            defaultVisible: true,  sortKey: 'insurance'       },
  { key: 'claimDate',           label: 'Date',             defaultVisible: true,  sortKey: 'claimDate'       },
  { key: 'payPeriod',           label: 'Pay Period',       defaultVisible: false                             },
  { key: 'submissionMethod',    label: 'Method',           defaultVisible: true,  sortKey: 'submissionMethod'},
  { key: 'serviceCode',         label: 'Code',             defaultVisible: true,  sortKey: 'serviceCode'     },
  { key: 'status',              label: 'Status',           defaultVisible: true,  sortKey: 'status'          },
  { key: 'clientAmount',        label: 'Client $',         defaultVisible: true,  sortKey: 'clientAmount'    },
  { key: 'trueClientAmount',    label: 'True Client $',    defaultVisible: false, sortKey: 'trueClientAmount'},
  { key: 'stripeFees',          label: 'Stripe Fees',      defaultVisible: false, sortKey: 'stripeFees'      },
  { key: 'insuranceAmount',     label: 'Insurance $',      defaultVisible: true,  sortKey: 'insuranceAmount' },
  { key: 'insurancePaidHHO',    label: 'Ins. Paid (HHO)',  defaultVisible: false                             },
  { key: 'overUnderHHO',        label: 'Over/Under (HHO)', defaultVisible: false                             },
  { key: 'totalPayment',        label: 'Total',            defaultVisible: true,  sortKey: 'totalPayment'    },
  { key: 'paymentDateReceived', label: 'Payment Date',     defaultVisible: false, sortKey: 'paymentDateReceived'},
  { key: 'lagDays',             label: 'Lag Days',         defaultVisible: false, sortKey: 'lagDays'         },
  { key: 'notes',               label: 'Notes',            defaultVisible: true                              },
]

const COLUMN_DEF_MAP = Object.fromEntries(COLUMN_DEFS.map(c => [c.key, c])) as Record<ColumnKey, typeof COLUMN_DEFS[number]>

const COL_STORAGE_KEY_V1 = 'clarity-claims-columns-v1'
const COL_STORAGE_KEY = 'clarity-claims-columns-v2'

function initColumnState(): { order: ColumnKey[]; hidden: Set<ColumnKey> } {
  const defaultOrder = COLUMN_DEFS.map(c => c.key)
  const defaultHidden = new Set(COLUMN_DEFS.filter(c => !c.defaultVisible).map(c => c.key))
  try {
    const v2 = localStorage.getItem(COL_STORAGE_KEY)
    if (v2) {
      const parsed = JSON.parse(v2) as { order: ColumnKey[]; hidden: ColumnKey[] }
      if (Array.isArray(parsed.order) && Array.isArray(parsed.hidden)) {
        return { order: parsed.order, hidden: new Set(parsed.hidden) }
      }
    }
    // Migrate from v1: preserve visibility, apply new default order
    const v1 = localStorage.getItem(COL_STORAGE_KEY_V1)
    if (v1) {
      const visibleKeys = new Set(JSON.parse(v1) as ColumnKey[])
      return { order: defaultOrder, hidden: new Set(defaultOrder.filter(k => !visibleKeys.has(k))) }
    }
  } catch {}
  return { order: defaultOrder, hidden: defaultHidden }
}

function persistColumns(order: ColumnKey[], hidden: Set<ColumnKey>) {
  try {
    localStorage.setItem(COL_STORAGE_KEY, JSON.stringify({ order, hidden: Array.from(hidden) }))
  } catch {}
}

interface Props {
  claims: Claim[]
  onStatusClick: (claim: Claim) => void
  compact?: boolean
}

function parseDate(s: string | undefined): number {
  if (!s) return 0
  const t = new Date(s).getTime()
  return isNaN(t) ? 0 : t
}

function compoundSort(a: Claim, b: Claim): number {
  let cmp = a.status.localeCompare(b.status)
  if (cmp !== 0) return cmp
  cmp = a.insurance.localeCompare(b.insurance)
  if (cmp !== 0) return cmp
  cmp = parseDate(a.claimDate) - parseDate(b.claimDate)
  if (cmp !== 0) return cmp
  const aPay = parseDate(a.paymentDateReceived)
  const bPay = parseDate(b.paymentDateReceived)
  if (!aPay && !bPay) return 0
  if (!aPay) return 1
  if (!bPay) return -1
  return aPay - bPay
}

function singleKeySort(a: Claim, b: Claim, key: SortKey, dir: 'asc' | 'desc'): number {
  let cmp = 0
  switch (key) {
    case 'claimDate':
      cmp = parseDate(a.claimDate) - parseDate(b.claimDate)
      break
    case 'paymentDateReceived': {
      const aPay = parseDate(a.paymentDateReceived)
      const bPay = parseDate(b.paymentDateReceived)
      if (!aPay && !bPay) return 0
      if (!aPay) return dir === 'asc' ? 1 : -1
      if (!bPay) return dir === 'asc' ? -1 : 1
      cmp = aPay - bPay
      break
    }
    case 'forecastPaymentDate': {
      const aF = parseDate(a.forecastPaymentDate)
      const bF = parseDate(b.forecastPaymentDate)
      if (!aF && !bF) return 0
      if (!aF) return dir === 'asc' ? 1 : -1
      if (!bF) return dir === 'asc' ? -1 : 1
      cmp = aF - bF
      break
    }
    case 'status': cmp = a.status.localeCompare(b.status); break
    case 'insurance': cmp = a.insurance.localeCompare(b.insurance); break
    case 'clinician': cmp = a.clinician.localeCompare(b.clinician); break
    case 'serviceCode': cmp = a.serviceCode.localeCompare(b.serviceCode); break
    case 'submissionMethod': cmp = a.submissionMethod.localeCompare(b.submissionMethod); break
    case 'totalPayment': cmp = a.totalPayment - b.totalPayment; break
    case 'insuranceAmount': cmp = a.insuranceAmount - b.insuranceAmount; break
    case 'clientAmount': cmp = a.clientAmount - b.clientAmount; break
    case 'lagDays': {
      const aL = a.lagDays ?? (dir === 'asc' ? Infinity : -Infinity)
      const bL = b.lagDays ?? (dir === 'asc' ? Infinity : -Infinity)
      cmp = aL - bL; break
    }
    case 'trueClientAmount': cmp = a.trueClientAmount - b.trueClientAmount; break
    case 'stripeFees': cmp = a.stripeFees - b.stripeFees; break
    case 'insurancePaidHHO': {
      cmp = (a.insurancePaidHHO ?? 0) - (b.insurancePaidHHO ?? 0); break
    }
    case 'overUnderHHO': {
      cmp = (a.overUnderHHO ?? 0) - (b.overUnderHHO ?? 0); break
    }
  }
  return dir === 'asc' ? cmp : -cmp
}

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
  const [userSort, setUserSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null)
  const [page, setPage] = useState(1)
  const [copiedClaimIds, setCopiedClaimIds] = useState<Set<number>>(initCopiedIds)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [colMenuOpen, setColMenuOpen] = useState(false)

  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(() => initColumnState().order)
  const [hiddenColumns, setHiddenColumns] = useState<Set<ColumnKey>>(() => initColumnState().hidden)

  const selectAllRef = useRef<HTMLInputElement>(null)
  const colMenuRef = useRef<HTMLDivElement>(null)
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const bulkUpdate = useBulkUpdateClaims()

  const activeColumns = columnOrder.filter(k => !hiddenColumns.has(k))

  // Compute sorted/paginated early so effects below can reference them
  const sorted = [...claims].sort((a, b) =>
    userSort ? singleKeySort(a, b, userSort.key, userSort.dir) : compoundSort(a, b)
  )
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ERA reconciliation sums — computed from full claims array so cross-page selections are included
  const selectedClaims = claims.filter(c => selectedRows.has(c.rowIndex))
  const selectedInsuranceSum = selectedClaims.reduce((sum, c) => sum + c.insuranceAmount, 0)
  const selectedTotalSum = selectedClaims.reduce((sum, c) => sum + c.totalPayment, 0)

  // Clear selection when the claims dataset changes (filter change or query refresh)
  useEffect(() => {
    setSelectedRows(new Set())
  }, [claims])

  // Close bulk modal if selection is cleared (e.g. by a filter change mid-session)
  useEffect(() => {
    if (selectedRows.size === 0) setBulkModalOpen(false)
  }, [selectedRows.size])

  // Drive the select-all checkbox indeterminate state after every render
  useEffect(() => {
    if (!selectAllRef.current) return
    const allSelected = paginated.length > 0 && paginated.every(c => selectedRows.has(c.rowIndex))
    const someSelected = paginated.some(c => selectedRows.has(c.rowIndex))
    selectAllRef.current.checked = allSelected
    selectAllRef.current.indeterminate = !allSelected && someSelected
  })

  // Close columns menu on outside click
  useEffect(() => {
    if (!colMenuOpen) return
    function handleOutside(e: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setColMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [colMenuOpen])

  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedRows(prev => {
      const next = new Set(prev)
      if (e.target.checked) {
        paginated.forEach(c => next.add(c.rowIndex))
      } else {
        paginated.forEach(c => next.delete(c.rowIndex))
      }
      return next
    })
  }

  function handleSelectRow(rowIndex: number, checked: boolean) {
    setSelectedRows(prev => {
      const next = new Set(prev)
      if (checked) next.add(rowIndex)
      else next.delete(rowIndex)
      return next
    })
  }

  async function handleBulkConfirm(update: { status: ClaimStatus; paymentDateReceived?: string }) {
    const success = await bulkUpdate.execute(Array.from(selectedRows), update)
    if (success) {
      setSelectedRows(new Set())
      setBulkModalOpen(false)
    }
  }

  function handleCopyClaimId(claim: Claim, e: React.MouseEvent) {
    e.stopPropagation()
    setCopiedClaimIds(prev => {
      const next = new Set(prev)
      if (prev.has(claim.rowIndex)) {
        next.delete(claim.rowIndex)
      } else {
        navigator.clipboard.writeText(claim.claimId ?? '')
        next.add(claim.rowIndex)
      }
      persistCopiedIds(next)
      return next
    })
  }

  function toggleColumn(key: ColumnKey) {
    setHiddenColumns(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      persistColumns(columnOrder, next)
      return next
    })
  }

  function resetToDefaults() {
    const defaultOrder = COLUMN_DEFS.map(c => c.key)
    const defaultHidden = new Set(COLUMN_DEFS.filter(c => !c.defaultVisible).map(c => c.key))
    setColumnOrder(defaultOrder)
    setHiddenColumns(defaultHidden)
    persistColumns(defaultOrder, defaultHidden)
  }

  function handleDragStart(index: number) {
    dragItem.current = index
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    dragOverItem.current = index
  }

  function handleDrop() {
    if (dragItem.current === null || dragOverItem.current === null) return
    if (dragItem.current === dragOverItem.current) { dragItem.current = null; dragOverItem.current = null; return }
    const from = dragItem.current
    const to = dragOverItem.current
    const newOrder = [...columnOrder]
    const [moved] = newOrder.splice(from, 1)
    newOrder.splice(to, 0, moved)
    setColumnOrder(newOrder)
    persistColumns(newOrder, hiddenColumns)
    dragItem.current = null
    dragOverItem.current = null
  }

  // 3 fixed columns: checkbox, SP link, Edit
  const visibleColSpan = activeColumns.length + 3

  const rowPy = compact ? 'py-1.5' : 'py-3'
  const cellText = compact ? 'text-xs' : 'text-sm'

  const toggleSort = (key: SortKey) => {
    setPage(1)
    setUserSort(s => s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const resetSort = () => { setUserSort(null); setPage(1) }

  const SortIcon = ({ col }: { col: SortKey }) =>
    userSort?.key === col
      ? userSort.dir === 'asc' ? <ChevronUp size={13} className="inline ml-0.5" /> : <ChevronDown size={13} className="inline ml-0.5" />
      : <ChevronDown size={13} className="inline ml-0.5 opacity-25" />

  function renderBodyCell(claim: Claim, key: ColumnKey) {
    switch (key) {
      case 'claimId': {
        const wasCopied = copiedClaimIds.has(claim.rowIndex)
        return (
          <td key={key} className={`px-4 ${rowPy} ${cellText} text-xs`}>
            <span className="inline-flex items-center gap-1">
              <InlineEditCell
                claim={claim}
                field="claimId"
                displayValue={claim.claimId ?? ''}
                rawValue={claim.claimId ?? ''}
                inputType="text"
              />
              {(claim.claimId || wasCopied) && (
                <button
                  type="button"
                  title={wasCopied ? 'Copied — click to clear' : 'Copy Claim ID'}
                  onClick={e => handleCopyClaimId(claim, e)}
                  className={`p-0.5 shrink-0 transition-colors ${wasCopied ? 'text-teal hover:text-teal-mid' : 'text-muted hover:text-teal'}`}
                >
                  {wasCopied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              )}
            </span>
          </td>
        )
      }
      case 'clientId':
        return (
          <td key={key} className={`px-4 ${rowPy} ${cellText}`}>
            <Tooltip content={claim.clientId ?? ''} disabled={!claim.clientId}>
              <span className="block max-w-24 truncate text-xs">
                {claim.clientId
                  ? <span className="text-ink">{claim.clientId}</span>
                  : <span className="text-muted">—</span>}
              </span>
            </Tooltip>
          </td>
        )
      case 'clinician':
        return (
          <td key={key} className={`px-4 ${rowPy} font-medium text-ink ${cellText}`}>{claim.clinician}</td>
        )
      case 'insurance':
        return (
          <td key={key} className={`px-4 ${rowPy} ${cellText}`}><PayerBadge payer={claim.insurance} /></td>
        )
      case 'claimDate':
        return (
          <td key={key} className={`px-4 ${rowPy} text-muted whitespace-nowrap ${cellText}`}>{formatDate(claim.claimDate)}</td>
        )
      case 'payPeriod':
        return (
          <td key={key} className={`px-4 ${rowPy} text-muted whitespace-nowrap ${cellText}`}>
            {claim.payPeriod || <span className="italic">—</span>}
          </td>
        )
      case 'submissionMethod':
        return (
          <td key={key} className={`px-4 ${rowPy} text-muted ${cellText}`}>
            <InlineEditCell
              claim={claim}
              field="submissionMethod"
              displayValue={claim.submissionMethod}
              rawValue={claim.submissionMethod}
              inputType="select"
              options={SUBMISSION_METHODS}
            />
          </td>
        )
      case 'serviceCode':
        return (
          <td key={key} className={`px-4 ${rowPy} text-xs text-ink`}>
            <InlineEditCell
              claim={claim}
              field="serviceCode"
              displayValue={claim.serviceCode}
              rawValue={claim.serviceCode}
              inputType="select"
              options={SERVICE_CODES}
            />
          </td>
        )
      case 'status':
        return (
          <td key={key} className={`px-4 ${rowPy}`}>
            <Badge status={claim.status} onClick={() => onStatusClick(claim)} />
          </td>
        )
      case 'clientAmount':
        return (
          <td key={key} className={`px-4 ${rowPy} text-right tabular-nums ${cellText}`}>
            <InlineEditCell
              claim={claim}
              field="clientAmount"
              displayValue={formatCurrency(claim.clientAmount)}
              rawValue={claim.clientAmount}
              inputType="number"
            />
          </td>
        )
      case 'trueClientAmount':
        return (
          <td key={key} className={`px-4 ${rowPy} text-right tabular-nums ${cellText}`}>
            {formatCurrency(claim.trueClientAmount)}
          </td>
        )
      case 'stripeFees':
        return (
          <td key={key} className={`px-4 ${rowPy} text-right tabular-nums text-muted ${cellText}`}>
            {claim.stripeFees > 0 ? formatCurrency(claim.stripeFees) : <span className="italic">—</span>}
          </td>
        )
      case 'insuranceAmount':
        return (
          <td key={key} className={`px-4 ${rowPy} text-right tabular-nums ${cellText}`}>
            <InlineEditCell
              claim={claim}
              field="insuranceAmount"
              displayValue={formatCurrency(claim.insuranceAmount)}
              rawValue={claim.insuranceAmount}
              inputType="number"
            />
          </td>
        )
      case 'insurancePaidHHO':
        return (
          <td key={key} className={`px-4 ${rowPy} text-right tabular-nums ${cellText}`}>
            <InlineEditCell
              claim={claim}
              field="insurancePaidHHO"
              displayValue={claim.insurancePaidHHO != null ? formatCurrency(claim.insurancePaidHHO) : ''}
              rawValue={claim.insurancePaidHHO ?? 0}
              inputType="number"
            />
          </td>
        )
      case 'overUnderHHO':
        return (
          <td key={key} className={`px-4 ${rowPy} text-right tabular-nums ${cellText}`}>
            {claim.overUnderHHO != null ? (
              <span className={
                claim.overUnderHHO > 0 ? 'text-green-600 font-medium' :
                claim.overUnderHHO < 0 ? 'text-error font-medium' : ''
              }>
                {formatCurrency(claim.overUnderHHO)}
              </span>
            ) : <span className="text-muted italic">—</span>}
          </td>
        )
      case 'totalPayment':
        return (
          <td key={key} className={`px-4 ${rowPy} text-right tabular-nums font-medium ${cellText}`}>{formatCurrency(claim.totalPayment)}</td>
        )
      case 'paymentDateReceived':
        return (
          <td key={key} className={`px-4 ${rowPy} text-muted whitespace-nowrap ${cellText}`}>
            <InlineEditCell
              claim={claim}
              field="paymentDateReceived"
              displayValue={claim.paymentDateReceived ? formatDate(claim.paymentDateReceived) : ''}
              rawValue={toInputDate(claim.paymentDateReceived ?? '')}
              inputType="date"
            />
          </td>
        )
      case 'lagDays':
        return (
          <td key={key} className={`px-4 ${rowPy} text-right tabular-nums ${cellText}`}>
            {claim.lagDays != null ? `${claim.lagDays}d` : <span className="text-muted italic">—</span>}
          </td>
        )
      case 'notes':
        return (
          <td key={key} className={`px-4 ${rowPy} text-muted max-w-40 ${cellText}`}>
            <Tooltip content={claim.notes ?? ''} disabled={!claim.notes}>
              <InlineEditCell
                claim={claim}
                field="notes"
                displayValue={claim.notes ?? ''}
                rawValue={claim.notes ?? ''}
                inputType="text"
              />
            </Tooltip>
          </td>
        )
      default:
        return <td key={key} />
    }
  }

  return (
    <div>
      {/* Sort reset + Columns chooser row */}
      <div className="flex items-center justify-between mb-1">
        {userSort ? (
          <button
            type="button"
            onClick={resetSort}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-teal font-body transition-colors"
          >
            <RotateCcw size={11} /> Reset sort
          </button>
        ) : (
          <div />
        )}

        {/* Columns chooser */}
        <div className="relative" ref={colMenuRef}>
          <button
            type="button"
            onClick={() => setColMenuOpen(o => !o)}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-teal font-body transition-colors border border-gray-200 rounded px-2 py-1 bg-white hover:border-teal/40"
          >
            <SlidersHorizontal size={11} />
            Columns
            {hiddenColumns.size > 0 && (
              <span className="ml-0.5 bg-teal text-white rounded-full text-[10px] px-1.5 leading-4">
                {activeColumns.length}
              </span>
            )}
          </button>

          {colMenuOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2">
              <p className="px-3 pb-1.5 text-[10px] font-medium text-muted uppercase tracking-wide border-b border-gray-100 mb-1">
                Columns · drag to reorder
              </p>
              {columnOrder.map((key, index) => {
                const def = COLUMN_DEF_MAP[key]
                return (
                  <div
                    key={key}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={e => handleDragOver(e, index)}
                    onDrop={handleDrop}
                    className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-cream group cursor-default"
                  >
                    <GripVertical
                      size={14}
                      className="text-gray-300 group-hover:text-gray-400 cursor-grab shrink-0"
                    />
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-body text-ink flex-1 select-none">
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.has(key)}
                        onChange={() => toggleColumn(key)}
                        onClick={e => e.stopPropagation()}
                        className="rounded border-gray-300 text-teal focus:ring-teal cursor-pointer"
                      />
                      {def.label}
                    </label>
                  </div>
                )
              })}
              <div className="border-t border-gray-100 mt-1 pt-1 px-3">
                <button
                  type="button"
                  onClick={resetToDefaults}
                  className="text-xs text-muted hover:text-teal font-body transition-colors"
                >
                  Reset to defaults
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk action bar — desktop only */}
      {selectedRows.size > 0 && (
        <div className="hidden md:flex items-center justify-between px-4 py-2.5 bg-teal-pale border border-teal/20 rounded-lg mb-2">
          <span className="text-sm font-body text-teal font-medium">
            {selectedRows.size} claim{selectedRows.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-5 text-sm font-body">
            <span>
              <span className="text-muted">Insurance:</span>{' '}
              <span className="font-semibold text-teal tabular-nums">{formatCurrency(selectedInsuranceSum)}</span>
            </span>
            <span>
              <span className="text-muted">Total:</span>{' '}
              <span className="font-semibold text-teal tabular-nums">{formatCurrency(selectedTotalSum)}</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSelectedRows(new Set())}
              className="text-sm font-body text-muted hover:text-ink transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setBulkModalOpen(true)}
              className="px-4 py-1.5 bg-teal text-white text-sm font-ui font-medium rounded-lg hover:bg-teal-mid transition-colors"
            >
              Update Selected
            </button>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm font-body">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {/* Checkbox column — fixed */}
              <th className="w-10 px-3 py-3">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="rounded border-gray-300 text-teal focus:ring-teal cursor-pointer"
                  onChange={handleSelectAll}
                  aria-label="Select all visible claims"
                />
              </th>
              {/* SP link column — fixed */}
              <th className="w-10 px-2 py-3" />
              {/* Dynamic columns */}
              {activeColumns.map(key => {
                const def = COLUMN_DEF_MAP[key]
                return (
                  <th
                    key={key}
                    className={[
                      'px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide whitespace-nowrap',
                      def.sortKey ? 'cursor-pointer select-none hover:text-ink' : '',
                    ].join(' ')}
                    onClick={def.sortKey ? () => toggleSort(def.sortKey!) : undefined}
                  >
                    {def.label}{def.sortKey && <SortIcon col={def.sortKey} />}
                  </th>
                )
              })}
              {/* Edit column — fixed */}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.length === 0 && (
              <tr>
                <td colSpan={visibleColSpan} className="px-4 py-8 text-center text-muted text-sm">
                  No claims match the current filters.
                </td>
              </tr>
            )}
            {paginated.map(claim => (
              <tr
                key={claim.rowIndex}
                className={[
                  'transition-colors',
                  selectedRows.has(claim.rowIndex)
                    ? 'bg-teal-pale/40'
                    : copiedClaimIds.has(claim.rowIndex)
                      ? 'bg-gold-tint hover:bg-gold-tint'
                      : 'hover:bg-teal-pale/20',
                ].join(' ')}
              >
                {/* Checkbox cell — fixed */}
                <td className="w-10 px-3 py-0 text-center">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(claim.rowIndex)}
                    onChange={e => handleSelectRow(claim.rowIndex, e.target.checked)}
                    onClick={e => e.stopPropagation()}
                    className="rounded border-gray-300 text-teal focus:ring-teal cursor-pointer"
                    aria-label={`Select claim ${claim.claimId ?? claim.rowIndex}`}
                  />
                </td>
                {/* SP link cell — fixed */}
                <td className="w-10 px-2 py-0 text-center">
                  {claim.clientId && (
                    <a
                      href={`https://secure.simplepractice.com/clients/${claim.clientId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in SimplePractice"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center justify-center text-muted hover:text-teal transition-colors p-1"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </td>
                {/* Dynamic cells in user-defined order */}
                {activeColumns.map(key => renderBodyCell(claim, key))}
                {/* Edit cell — fixed */}
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

      {/* Bulk update modal */}
      {bulkModalOpen && (
        <BulkUpdateModal
          selectedCount={selectedRows.size}
          onConfirm={handleBulkConfirm}
          onClose={() => setBulkModalOpen(false)}
          isSubmitting={bulkUpdate.isSubmitting}
        />
      )}
    </div>
  )
}

// ─── MOBILE CARD ─────────────────────────────────────────────────────────────

function MobileCard({ claim, onStatusClick }: { claim: Claim; onStatusClick: (c: Claim) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
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
            <PayerBadge payer={claim.insurance} />
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
              Code: <span className="text-ink">{claim.serviceCode}</span>
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
              {claim.notes ? (
                <Tooltip content={claim.notes}>
                  <span>Notes: <span className="text-ink">{claim.notes}</span></span>
                </Tooltip>
              ) : (
                <span className="text-teal">+ Add notes</span>
              )}
            </button>
            {claim.claimId && (
              <button
                className="col-span-2 text-left inline-flex items-center gap-1 hover:text-teal transition-colors"
                onClick={e => {
                  e.stopPropagation()
                  navigator.clipboard.writeText(claim.claimId ?? '')
                  setCopiedId(true)
                  setTimeout(() => setCopiedId(false), 1500)
                }}
              >
                Claim ID: <span className="text-ink">{claim.claimId}</span>
                {copiedId
                  ? <Check size={11} className="text-green-600 ml-1" />
                  : <Copy size={11} className="text-muted ml-1" />}
              </button>
            )}
            {claim.clientId && (
              <span className="col-span-2 text-left">
                Client ID: <span className="text-ink">{claim.clientId}</span>
              </span>
            )}
            <span className="col-span-2 pt-1 flex items-center gap-4">
              <Link
                to={`/claims/${claim.rowIndex}/edit`}
                className="text-xs text-teal hover:underline font-body"
                onClick={e => e.stopPropagation()}
              >
                Full edit
              </Link>
              {claim.clientId && (
                <a
                  href={`https://secure.simplepractice.com/clients/${claim.clientId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted hover:text-teal font-body transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink size={12} /> View in SimplePractice
                </a>
              )}
            </span>
          </div>
        )}
      </div>
    </>
  )
}
