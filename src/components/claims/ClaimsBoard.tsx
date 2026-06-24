import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { createColumnHelper, type ColumnDef, type RowSelectionState } from '@tanstack/react-table'
import { Copy, Check, X } from 'lucide-react'
import type { Claim, ClaimStatus } from '../../types'
import { SERVICE_CODES, SUBMISSION_METHODS } from '../../types'
import { formatCurrency, formatDate, toInputDate } from '../../lib/utils'
import { useInlineEditClaim, useBulkUpdateClaims } from '../../hooks/useClaims'
import Board from '../board/Board'
import StatusCell, { STATUS_COLORS } from '../board/cells/StatusCell'
import CurrencyCell from '../board/cells/CurrencyCell'
import DateCell from '../board/cells/DateCell'
import PersonCell from '../board/cells/PersonCell'
import TextCell from '../board/cells/TextCell'
import LinkCell from '../board/cells/LinkCell'
import NumberCell from '../board/cells/NumberCell'
import Tooltip from '../ui/Tooltip'
import { PayerBadge } from '../ui/Badge'
import BulkUpdateModal from './BulkUpdateModal'
import Button from '../ui/Button'

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

const STATUS_ORDER: ClaimStatus[] = [
  'Pending', 'Payment Pending', 'Deductible', 'Sent to Secondary',
  'Payment Received', 'Finalized', 'Denied',
]

const GROUP_CONFIG = Object.fromEntries(
  STATUS_ORDER.map(s => [s, { color: STATUS_COLORS[s], label: s }])
) as Record<string, { color: string; label: string }>

interface Props {
  claims: Claim[]
  onStatusClick: (claim: Claim) => void
  compact?: boolean
}

export default function ClaimsBoard({ claims, onStatusClick, compact = false }: Props) {
  const { mutateAsync: inlineEdit } = useInlineEditClaim()
  const bulkUpdate = useBulkUpdateClaims()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [copiedClaimIds, setCopiedClaimIds] = useState<Set<number>>(initCopiedIds)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)

  useEffect(() => { setRowSelection({}) }, [claims])
  useEffect(() => { if (Object.keys(rowSelection).length === 0) setBulkModalOpen(false) }, [rowSelection])

  const save = useCallback(
    (rowIndex: number, field: string) => async (value: string) => {
      const parsed: string | number = ['clientAmount', 'insuranceAmount', 'insurancePaidHHO'].includes(field)
        ? parseFloat(value) || 0
        : value
      await inlineEdit({ rowIndex, field: field as never, value: parsed })
    },
    [inlineEdit]
  )

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

  const col = createColumnHelper<Claim>()

  const columns = [
    col.display({
      id: 'select',
      size: 40,
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="rounded border-gray-300 text-teal focus:ring-teal cursor-pointer"
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={e => e.stopPropagation()}
          className="rounded border-gray-300 text-teal focus:ring-teal cursor-pointer"
          aria-label={`Select claim ${row.original.claimId ?? row.original.rowIndex}`}
        />
      ),
    }),
    col.display({
      id: 'spLink',
      size: 40,
      enableSorting: false,
      enableHiding: false,
      header: '',
      cell: ({ row }) => row.original.clientId
        ? <LinkCell href={`https://secure.simplepractice.com/clients/${row.original.clientId}`} title="Open in SimplePractice" />
        : null,
    }),
    col.accessor('claimId', {
      header: 'Claim ID',
      size: 110,
      enableSorting: false,
      cell: ({ row }) => {
        const claim = row.original
        const wasCopied = copiedClaimIds.has(claim.rowIndex)
        return (
          <span className="inline-flex items-center gap-1">
            <TextCell value={claim.claimId ?? ''} onSave={save(claim.rowIndex, 'claimId')} />
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
        )
      },
    }),
    col.accessor('clientId', {
      header: 'Client ID',
      size: 100,
      enableSorting: false,
      cell: ({ getValue }) => {
        const v = getValue()
        return (
          <Tooltip content={v ?? ''} disabled={!v}>
            <span className="block max-w-24 truncate text-xs">
              {v ? <span className="text-ink">{v}</span> : <span className="text-muted">—</span>}
            </span>
          </Tooltip>
        )
      },
    }),
    col.accessor('clinician', {
      header: 'Clinician',
      size: 120,
      cell: ({ getValue }) => <PersonCell name={getValue()} />,
    }),
    col.accessor('insurance', {
      header: 'Payer',
      size: 110,
      cell: ({ getValue }) => <PayerBadge payer={getValue()} />,
    }),
    col.accessor('claimDate', {
      header: 'Date',
      size: 110,
      sortingFn: (a, b) => new Date(a.original.claimDate).getTime() - new Date(b.original.claimDate).getTime(),
      cell: ({ getValue }) => <span className="text-muted whitespace-nowrap">{formatDate(getValue())}</span>,
    }),
    col.accessor('payPeriod', {
      header: 'Pay Period',
      enableSorting: false,
      meta: { defaultHidden: true },
      cell: ({ getValue }) => <span className="text-muted whitespace-nowrap">{getValue() || '—'}</span>,
    }),
    col.accessor('submissionMethod', {
      header: 'Method',
      size: 100,
      cell: ({ row }) => (
        <TextCell
          value={row.original.submissionMethod}
          onSave={save(row.original.rowIndex, 'submissionMethod')}
          inputType="select"
          options={SUBMISSION_METHODS}
        />
      ),
    }),
    col.accessor('serviceCode', {
      header: 'Code',
      size: 80,
      cell: ({ row }) => (
        <TextCell
          value={row.original.serviceCode}
          onSave={save(row.original.rowIndex, 'serviceCode')}
          inputType="select"
          options={SERVICE_CODES}
        />
      ),
    }),
    col.accessor('status', {
      header: 'Status',
      size: 140,
      cell: ({ row }) => <StatusCell status={row.original.status} onClick={() => onStatusClick(row.original)} />,
    }),
    col.accessor('clientAmount', {
      header: 'Client $',
      size: 100,
      cell: ({ row }) => <CurrencyCell value={row.original.clientAmount} onSave={save(row.original.rowIndex, 'clientAmount')} />,
    }),
    col.accessor('trueClientAmount', {
      header: 'True Client $',
      size: 100,
      meta: { defaultHidden: true },
      cell: ({ getValue }) => <span className="tabular-nums text-right">{formatCurrency(getValue())}</span>,
    }),
    col.accessor('stripeFees', {
      header: 'Stripe Fees',
      size: 90,
      meta: { defaultHidden: true },
      cell: ({ getValue }) => {
        const v = getValue()
        return v > 0
          ? <span className="tabular-nums text-right text-muted">{formatCurrency(v)}</span>
          : <span className="text-muted italic">—</span>
      },
    }),
    col.accessor('insuranceAmount', {
      header: 'Insurance $',
      size: 100,
      cell: ({ row }) => <CurrencyCell value={row.original.insuranceAmount} onSave={save(row.original.rowIndex, 'insuranceAmount')} />,
    }),
    col.accessor('insurancePaidHHO', {
      header: 'Ins. Paid (HHO)',
      size: 110,
      meta: { defaultHidden: true },
      cell: ({ row }) => (
        <CurrencyCell value={row.original.insurancePaidHHO ?? 0} onSave={save(row.original.rowIndex, 'insurancePaidHHO')} />
      ),
    }),
    col.accessor('overUnderHHO', {
      header: 'Over/Under (HHO)',
      size: 120,
      meta: { defaultHidden: true },
      cell: ({ getValue }) => {
        const v = getValue()
        if (v == null) return <span className="text-muted italic">—</span>
        return (
          <span className={`tabular-nums text-right font-medium ${v > 0 ? 'text-green-600' : v < 0 ? 'text-error' : ''}`}>
            {formatCurrency(v)}
          </span>
        )
      },
    }),
    col.accessor('totalPayment', {
      header: 'Total',
      size: 100,
      cell: ({ getValue }) => <span className="tabular-nums text-right font-medium">{formatCurrency(getValue())}</span>,
    }),
    col.accessor('paymentDateReceived', {
      header: 'Payment Date',
      size: 120,
      meta: { defaultHidden: true },
      sortingFn: (a, b) => {
        const aT = a.original.paymentDateReceived ? new Date(a.original.paymentDateReceived).getTime() : 0
        const bT = b.original.paymentDateReceived ? new Date(b.original.paymentDateReceived).getTime() : 0
        return aT - bT
      },
      cell: ({ row }) => (
        <DateCell
          value={row.original.paymentDateReceived ?? ''}
          rawValue={toInputDate(row.original.paymentDateReceived ?? '')}
          onSave={save(row.original.rowIndex, 'paymentDateReceived')}
        />
      ),
    }),
    col.accessor('lagDays', {
      header: 'Lag Days',
      size: 80,
      meta: { defaultHidden: true },
      cell: ({ getValue }) => <NumberCell value={getValue() ?? null} suffix="d" />,
    }),
    col.accessor('notes', {
      header: 'Notes',
      size: 140,
      enableSorting: false,
      cell: ({ row }) => (
        <Tooltip content={row.original.notes ?? ''} disabled={!row.original.notes}>
          <TextCell value={row.original.notes ?? ''} onSave={save(row.original.rowIndex, 'notes')} truncate />
        </Tooltip>
      ),
    }),
    col.display({
      id: 'edit',
      size: 60,
      enableSorting: false,
      enableHiding: false,
      header: '',
      cell: ({ row }) => (
        <Link
          to={`/claims/${row.original.rowIndex}/edit`}
          className="text-xs text-teal hover:underline font-ui"
          onClick={e => e.stopPropagation()}
        >
          Edit
        </Link>
      ),
    }),
  ]

  const selectedRowIndices = Object.keys(rowSelection)
    .filter(k => rowSelection[k])
    .map(k => parseInt(k))
  const selectedClaims = claims.filter(c => selectedRowIndices.includes(c.rowIndex))
  const selectedInsuranceSum = selectedClaims.reduce((sum, c) => sum + c.insuranceAmount, 0)
  const selectedTotalSum = selectedClaims.reduce((sum, c) => sum + c.totalPayment, 0)

  async function handleBulkConfirm(update: { status: ClaimStatus; paymentDateReceived?: string }) {
    const success = await bulkUpdate.execute(selectedRowIndices, update)
    if (success) {
      setRowSelection({})
      setBulkModalOpen(false)
    }
  }

  const selectionBar = selectedRowIndices.length > 0 ? (
    <div className="hidden md:flex items-center justify-between px-4 py-2.5 bg-teal-pale border border-teal/20 rounded-lg mb-2">
      <span className="text-sm font-ui text-teal font-medium">
        {selectedRowIndices.length} claim{selectedRowIndices.length !== 1 ? 's' : ''} selected
      </span>
      <div className="flex items-center gap-5 text-sm font-ui">
        <span>
          <span className="text-muted">Insurance:</span>{' '}
          <span className="font-semibold text-teal tabular-nums">{formatCurrency(selectedInsuranceSum)}</span>
        </span>
        <span>
          <span className="text-muted">Total:</span>{' '}
          <span className="font-semibold text-teal tabular-nums">{formatCurrency(selectedTotalSum)}</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setRowSelection({})} className="text-sm font-ui text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded">
          <X size={14} className="inline mr-1" />Clear
        </button>
        <Button size="sm" onClick={() => setBulkModalOpen(true)}>Update Selected</Button>
      </div>
    </div>
  ) : null

  return (
    <>
      {/* Desktop board */}
      <div className="hidden md:block">
        <Board
          data={claims}
          columns={columns as ColumnDef<Claim, unknown>[]}
          getRowId={(c) => String(c.rowIndex)}
          groupBy={(c) => c.status}
          groupOrder={STATUS_ORDER}
          groupConfig={GROUP_CONFIG}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          enableRowSelection
          initialSorting={[
            { id: 'insurance', desc: false },
            { id: 'claimDate', desc: false },
            { id: 'paymentDateReceived', desc: false },
          ]}
          storageKey="claims"
          addRowPath="/claims/new"
          addRowLabel="New Claim"
          selectionBar={selectionBar}
          compact={compact}
          emptyMessage="No claims match the current filters."
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {claims.length === 0 && (
          <p className="text-center text-muted text-sm py-8">No claims match the current filters.</p>
        )}
        {claims.slice(0, 50).map(claim => (
          <MobileCard key={claim.rowIndex} claim={claim} onStatusClick={onStatusClick} />
        ))}
        {claims.length > 50 && (
          <p className="text-center text-muted text-xs py-2">
            Showing 50 of {claims.length} claims. Use filters to narrow results.
          </p>
        )}
      </div>

      {bulkModalOpen && (
        <BulkUpdateModal
          selectedCount={selectedRowIndices.length}
          onConfirm={handleBulkConfirm}
          onClose={() => setBulkModalOpen(false)}
          isSubmitting={bulkUpdate.isSubmitting}
        />
      )}
    </>
  )
}

function MobileCard({ claim, onStatusClick }: { claim: Claim; onStatusClick: (c: Claim) => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="bg-white rounded-lg border border-border px-4 py-3 cursor-pointer"
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-ink text-sm">{claim.clinician}</span>
          <PayerBadge payer={claim.insurance} />
          <span className="text-muted text-xs whitespace-nowrap">{formatDate(claim.claimDate)}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusCell status={claim.status} onClick={() => { onStatusClick(claim) }} />
          <span className="font-medium text-sm tabular-nums">{formatCurrency(claim.totalPayment)}</span>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted">
          <span>Code: <span className="text-ink">{claim.serviceCode}</span></span>
          <span>Client: <span className="text-ink">{formatCurrency(claim.clientAmount)}</span></span>
          <span>Method: <span className="text-ink">{claim.submissionMethod}</span></span>
          <span>Insurance: <span className="text-ink">{formatCurrency(claim.insuranceAmount)}</span></span>
          {claim.notes && <span className="col-span-2">Notes: <span className="text-ink">{claim.notes}</span></span>}
          <span className="col-span-2 pt-1">
            <Link
              to={`/claims/${claim.rowIndex}/edit`}
              className="text-xs text-teal hover:underline font-ui"
              onClick={e => e.stopPropagation()}
            >
              Full edit
            </Link>
          </span>
        </div>
      )}
    </div>
  )
}
