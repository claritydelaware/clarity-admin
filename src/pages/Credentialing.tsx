import { useState } from 'react'
import { Plus, ShieldCheck } from 'lucide-react'
import { useCredentialing } from '../hooks/useCredentialing'
import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
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

  const byClinician = (clinician: Clinician): CredentialingRecord[] =>
    (records ?? [])
      .filter(r => r.clinician === clinician)
      .sort((a, b) => a.payer.localeCompare(b.payer))

  return (
    <div className="space-y-4">
      <PageHeader title="Credentialing" subtitle="Payer enrollment status per clinician" />

      {isLoading && <LoadingSpinner label="Loading credentialing records…" />}
      {isError && <ErrorBanner message={(error as Error).message} />}

      {records && (
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
                    <tbody className="divide-y divide-gray-100">
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
