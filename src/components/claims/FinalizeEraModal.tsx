import { useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import Dialog from '../ui/Dialog'
import Button from '../ui/Button'
import { formatCurrency } from '../../lib/utils'
import { useClaims } from '../../hooks/useClaims'
import { useHhoEraLog, useCreateHhoEraLogEntry } from '../../hooks/useHhoEraLog'

interface FinalizeEraModalProps {
  eraReference: string
  onClose: () => void
  onFinalized: () => void
}

// Deliberately calls useClaims() with no filter, independent of whatever filters (Client ID,
// service code, date range, etc.) happen to be active on the Claims page — the reserve
// calculation must never silently miss a tagged claim because of an unrelated active filter.
export default function FinalizeEraModal({ eraReference, onClose, onFinalized }: FinalizeEraModalProps) {
  const { data: allClaims } = useClaims()
  const { data: eraLogEntries } = useHhoEraLog()
  const createEntry = useCreateHhoEraLogEntry()

  const [eraDate, setEraDate] = useState('')
  const [actualDeposited, setActualDeposited] = useState('')
  const [residualDueToHHO, setResidualDueToHHO] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')
  const [notes, setNotes] = useState('')

  const isFirstEntry = eraLogEntries != null && eraLogEntries.length === 0

  // Mirrors the Worker's hhoEraContribution() so the preview matches what actually gets
  // logged: a claim reconciled before contributes only the delta since its last reconciled
  // HHO Paid (the real cash movement this round), not its full contracted rate again —
  // counting the full rate a second time would double-count revenue already reserved.
  const preview = useMemo(() => {
    if (!allClaims) return null
    const matched = allClaims.filter(c => c.hhoEraReference === eraReference)
    return {
      count: matched.length,
      trueRateTotal: matched.reduce((s, c) => s + (
        c.hhoLastReconciledPaid != null
          ? c.hhoLastReconciledPaid - (c.insurancePaidHHO ?? 0)
          : c.insuranceAmount
      ), 0),
      actualPaidTotal: matched.reduce((s, c) => s + (c.insurancePaidHHO ?? 0), 0),
    }
  }, [allClaims, eraReference])

  const depositedNum = parseFloat(actualDeposited) || 0
  const netTransfer = preview ? depositedNum - preview.trueRateTotal : 0
  const direction = netTransfer > 0 ? 'to-savings' : netTransfer < 0 ? 'to-checking' : 'none'

  const canSubmit = Boolean(eraDate) && actualDeposited !== '' && (!isFirstEntry || openingBalance !== '')

  const inputClass = 'w-full h-9 rounded-lg border border-border bg-white px-3 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal'
  const labelClass = 'block text-xs font-medium text-muted font-ui mb-1.5'

  async function handleSubmit() {
    await createEntry.mutateAsync({
      eraDate,
      eraReference,
      actualDeposited: depositedNum,
      residualDueToHHO: residualDueToHHO !== '' ? parseFloat(residualDueToHHO) : undefined,
      openingBalance: isFirstEntry ? (parseFloat(openingBalance) || 0) : undefined,
      notes: notes || undefined,
    })
    onFinalized()
  }

  return (
    <Dialog open onClose={onClose} title={`Finalize ERA — ${eraReference}`} maxWidth="sm">
      <div className="space-y-4">
        {preview && preview.count === 0 && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm font-body text-amber-800">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            No claims are currently tagged with "{eraReference}" — check for a typo before finalizing.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface-sunken px-4 py-3 text-sm font-ui">
          <div>
            <span className="text-muted">Claims tagged:</span>{' '}
            <span className="font-semibold text-ink tabular-nums">{preview?.count ?? '—'}</span>
          </div>
          <div>
            <span className="text-muted">Actual paid (HHO):</span>{' '}
            <span className="font-semibold text-ink tabular-nums">{preview ? formatCurrency(preview.actualPaidTotal) : '—'}</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted">True-rate total:</span>{' '}
            <span className="font-semibold text-teal tabular-nums">{preview ? formatCurrency(preview.trueRateTotal) : '—'}</span>
          </div>
        </div>

        <div>
          <label className={labelClass}>ERA Date *</label>
          <input type="date" value={eraDate} onChange={e => setEraDate(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Actual $ Deposited *</label>
          <input type="number" step="0.01" value={actualDeposited} onChange={e => setActualDeposited(e.target.value)} className={inputClass} placeholder="0.00" />
        </div>

        {isFirstEntry && (
          <div>
            <label className={labelClass}>
              Opening Reserve Balance *
              <span className="ml-1.5 font-normal text-[10px] text-muted normal-case">first entry — seeds the running balance</span>
            </label>
            <input type="number" step="0.01" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} className={inputClass} placeholder="0.00" />
          </div>
        )}

        <div>
          <label className={labelClass}>Residual Still Due to HHO (optional)</label>
          <input type="number" step="0.01" value={residualDueToHHO} onChange={e => setResidualDueToHHO(e.target.value)} className={inputClass} placeholder="0.00" />
        </div>

        <div>
          <label className={labelClass}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} className={`${inputClass} h-auto py-2`} rows={2} />
        </div>

        {actualDeposited !== '' && preview && (
          <div className="rounded-xl border border-teal/20 bg-teal-pale px-4 py-3 text-sm font-ui">
            <span className="text-muted">Net transfer:</span>{' '}
            <span className={`font-semibold tabular-nums ${netTransfer < 0 ? 'text-error' : 'text-teal'}`}>
              {formatCurrency(Math.abs(netTransfer))}
            </span>{' '}
            <span className="text-muted">
              {direction === 'to-savings' && '→ checking to savings'}
              {direction === 'to-checking' && '→ savings to checking'}
              {direction === 'none' && '(no transfer needed)'}
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!canSubmit} loading={createEntry.isPending}>
          Log ERA
        </Button>
      </div>
    </Dialog>
  )
}
