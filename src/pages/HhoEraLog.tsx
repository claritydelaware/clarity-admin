import { useState } from 'react'
import { Landmark } from 'lucide-react'
import { useHhoEraLog } from '../hooks/useHhoEraLog'
import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorBanner from '../components/ui/ErrorBanner'
import EmptyState from '../components/ui/EmptyState'
import FinalizeEraModal from '../components/claims/FinalizeEraModal'
import { formatCurrency, formatDate } from '../lib/utils'

export default function HhoEraLog() {
  const { data: entries, isLoading, isError, error } = useHhoEraLog()
  const [refInput, setRefInput] = useState('')
  const [finalizeRef, setFinalizeRef] = useState<string | null>(null)

  const sorted = [...(entries ?? [])].sort((a, b) => b.eraDate.localeCompare(a.eraDate))
  const currentBalance = sorted[0]?.runningReserveBalance

  return (
    <div className="space-y-4">
      <PageHeader
        title="HHO ERA Log"
        subtitle="Reserve-transfer ledger — one entry per remittance, append-only. Tag claims from the Claims board, then finalize here."
      />

      {isLoading && <LoadingSpinner label="Loading ERA log…" />}
      {isError && <ErrorBanner message={(error as Error).message} />}

      {entries && (
        <>
          <Card
            title="Log an ERA"
            subtitle={
              currentBalance != null
                ? `Current reserve balance: ${formatCurrency(currentBalance)}`
                : 'No entries yet — the first one seeds the opening reserve balance.'
            }
            actions={
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={refInput}
                  onChange={e => setRefInput(e.target.value)}
                  placeholder="ERA reference…"
                  className="h-9 w-52 rounded-lg border border-border bg-white px-3 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal"
                />
                <Button size="sm" disabled={!refInput.trim()} onClick={() => setFinalizeRef(refInput.trim())}>
                  Log Entry
                </Button>
              </div>
            }
          >
            <p className="text-xs text-muted font-body">
              Most ERAs are tagged and finalized directly from the Claims board's selection bar. Use this only to
              re-open the finalize flow for a reference, or to seed the opening balance if no claims are tagged yet.
            </p>
          </Card>

          {sorted.length === 0 ? (
            <EmptyState
              icon={<Landmark size={32} />}
              title="No ERA entries logged yet"
              description="Tag claims with an ERA reference on the Claims board, then finalize it here or from the board's selection bar."
            />
          ) : (
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-body">
                  <thead>
                    <tr className="border-b border-border text-xs font-ui text-muted uppercase tracking-wide">
                      <th className="text-left py-2.5 px-4">ERA Date</th>
                      <th className="text-left py-2.5 px-4">Reference</th>
                      <th className="text-right py-2.5 px-4">Deposited</th>
                      <th className="text-right py-2.5 px-4">True-Rate Total</th>
                      <th className="text-right py-2.5 px-4">Net Transfer</th>
                      <th className="text-right py-2.5 px-4">Running Balance</th>
                      <th className="text-right py-2.5 px-4">Residual Due</th>
                      <th className="text-left py-2.5 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sorted.map(e => (
                      <tr key={e.rowIndex}>
                        <td className="py-2.5 px-4 text-ink whitespace-nowrap">{formatDate(e.eraDate)}</td>
                        <td className="py-2.5 px-4 text-ink whitespace-nowrap">{e.eraReference}</td>
                        <td className="py-2.5 px-4 text-right text-ink tabular-nums whitespace-nowrap">{formatCurrency(e.actualDeposited)}</td>
                        <td className="py-2.5 px-4 text-right text-ink tabular-nums whitespace-nowrap">{formatCurrency(e.trueRateTotal)}</td>
                        <td className={`py-2.5 px-4 text-right tabular-nums whitespace-nowrap font-medium ${e.direction === 'to-checking' ? 'text-error' : e.direction === 'to-savings' ? 'text-success' : 'text-muted'}`}>
                          {e.direction === 'none' ? '—' : formatCurrency(Math.abs(e.netTransfer))}
                          {e.direction !== 'none' && (
                            <span className="ml-1 text-[10px] font-ui text-muted normal-case">
                              {e.direction === 'to-savings' ? '→ savings' : '→ checking'}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right text-teal font-semibold tabular-nums whitespace-nowrap">{formatCurrency(e.runningReserveBalance)}</td>
                        <td className="py-2.5 px-4 text-right text-ink tabular-nums whitespace-nowrap">{e.residualDueToHHO != null ? formatCurrency(e.residualDueToHHO) : '—'}</td>
                        <td className="py-2.5 px-4 text-muted text-xs max-w-xs truncate" title={e.notes}>{e.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {finalizeRef && (
        <FinalizeEraModal
          eraReference={finalizeRef}
          onClose={() => setFinalizeRef(null)}
          onFinalized={() => { setFinalizeRef(null); setRefInput('') }}
        />
      )}
    </div>
  )
}
