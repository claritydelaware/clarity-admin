import { useMemo, useState } from 'react'
import { Plus, ShieldCheck } from 'lucide-react'
import { useCredentialing } from '../hooks/useCredentialing'
import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Tabs from '../components/ui/Tabs'
import { SkeletonTable } from '../components/ui/Skeleton'
import ErrorBanner from '../components/ui/ErrorBanner'
import EmptyState from '../components/ui/EmptyState'
import { CredentialingStatusBadge } from '../components/ui/Badge'
import CredentialingModal from '../components/credentialing/CredentialingModal'
import { CLINICIANS } from '../types'
import type { CredentialingRecord, Clinician } from '../types'

function formatDate(d?: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Credentialing() {
  const { data: records, isLoading, isError, error } = useCredentialing()
  const [addingFor, setAddingFor] = useState<Clinician | null>(null)
  const [editing, setEditing] = useState<CredentialingRecord | null>(null)
  const [view, setView] = useState<'matrix' | 'clinician'>('matrix')

  const matrix = useMemo(() => {
    const payers = [...new Set((records ?? []).map(r => r.payer))].sort((a, b) => a.localeCompare(b))
    const cell = new Map<string, CredentialingRecord>()
    for (const r of records ?? []) cell.set(`${r.payer}|${r.clinician}`, r)
    return { payers, cell }
  }, [records])

  const byClinician = (clinician: Clinician): CredentialingRecord[] =>
    (records ?? [])
      .filter(r => r.clinician === clinician)
      .sort((a, b) => a.payer.localeCompare(b.payer))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Credentialing"
        subtitle="Payer enrollment status per clinician"
        actions={
          <Tabs
            tabs={[{ value: 'matrix', label: 'Matrix' }, { value: 'clinician', label: 'By clinician' }]}
            value={view}
            onChange={v => setView(v as 'matrix' | 'clinician')}
            size="sm"
          />
        }
      />

      {isLoading && <SkeletonTable rows={6} />}
      {isError && <ErrorBanner message={(error as Error).message} />}

      {records && view === 'matrix' && (
        <Card padding="none">
          {matrix.payers.length === 0 ? (
            <EmptyState icon={<ShieldCheck size={32} />} title="No payers tracked yet" description="Switch to By clinician to add the first one." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body min-w-[560px]">
                <thead className="bg-surface-sunken border-b border-border">
                  <tr>
                    <th className="px-5 py-3 text-left table-th">Payer</th>
                    {CLINICIANS.map(c => <th key={c} className="px-4 py-3 text-left table-th">{c}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {matrix.payers.map(payer => (
                    <tr key={payer} className="hover:bg-surface-sunken transition-colors">
                      <th scope="row" className="px-5 py-2.5 text-left font-medium text-ink">{payer}</th>
                      {CLINICIANS.map(c => {
                        const r = matrix.cell.get(`${payer}|${c}`)
                        return (
                          <td key={c} className="px-4 py-2.5">
                            {r ? (
                              <CredentialingStatusBadge status={r.status} onClick={() => setEditing(r)} />
                            ) : (
                              <span className="text-muted/60" title="Not tracked">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {records && view === 'clinician' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {CLINICIANS.map(clinician => {
            const rows = byClinician(clinician)
            return (
              <Card
                key={clinician}
                title={clinician}
                actions={
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Plus size={14} strokeWidth={2.5} />}
                    onClick={() => setAddingFor(clinician)}
                  >
                    Add Payer
                  </Button>
                }
                padding="none"
              >
                {rows.length === 0 ? (
                  <EmptyState
                    icon={<ShieldCheck size={32} />}
                    title="No payers tracked yet"
                    description="Add the first one above."
                  />
                ) : (
                  <table className="w-full text-sm font-body">
                    <tbody className="divide-y divide-border">
                      {rows.map(r => (
                        <tr key={r.rowIndex} className="hover:bg-surface-sunken transition-colors">
                          <td className="px-5 py-3 font-medium text-ink">{r.payer}</td>
                          <td className="px-4 py-3">
                            <CredentialingStatusBadge status={r.status} onClick={() => setEditing(r)} />
                          </td>
                          <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                            {r.dateEffective
                              ? `Effective ${formatDate(r.dateEffective)}`
                              : r.dateSubmitted
                                ? `Submitted ${formatDate(r.dateSubmitted)}`
                                : '—'}
                          </td>
                          <td className="px-4 py-3 text-muted text-xs">{r.providerIdentifier || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {addingFor && <CredentialingModal clinician={addingFor} onClose={() => setAddingFor(null)} />}
      {editing && (
        <CredentialingModal clinician={editing.clinician} record={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
