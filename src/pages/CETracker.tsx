import { useState } from 'react'
import { Plus, GraduationCap } from 'lucide-react'
import { useCEStatus, useCELog } from '../hooks/useCE'
import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import ProgressBar from '../components/ui/ProgressBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorBanner from '../components/ui/ErrorBanner'
import EmptyState from '../components/ui/EmptyState'
import { CEStatusBadge } from '../components/ui/Badge'
import CELogModal from '../components/ce/CELogModal'
import { CLINICIANS } from '../types'
import type { CELogRecord, Clinician } from '../types'
import { CLINICIAN_COLORS, formatDate } from '../lib/utils'

export default function CETracker() {
  const { data: statusRecords, isLoading: statusLoading, isError: statusError, error: statusErr } = useCEStatus()
  const { data: logRecords, isLoading: logLoading, isError: logError, error: logErr } = useCELog()
  const [addingFor, setAddingFor] = useState<Clinician | null>(null)
  const [editing, setEditing] = useState<CELogRecord | null>(null)

  const isLoading = statusLoading || logLoading
  const isError = statusError || logError

  const logsFor = (clinician: Clinician): CELogRecord[] =>
    (logRecords ?? [])
      .filter(l => l.clinician === clinician)
      .sort((a, b) => b.dateCompleted.localeCompare(a.dateCompleted))

  return (
    <div className="space-y-4">
      <PageHeader title="CE Tracker" subtitle="Continuing education hours vs. DE license requirement, current cycle" />

      {isLoading && <LoadingSpinner label="Loading CE status…" />}
      {isError && <ErrorBanner message={((statusErr ?? logErr) as Error).message} />}

      {statusRecords && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {CLINICIANS.map(clinician => {
            const status = statusRecords.find(s => s.clinician === clinician)
            const entries = logsFor(clinician)
            const categoryOptions = [
              'General', 'Ethics',
              ...(status?.otherSubRequirementLabel ? [status.otherSubRequirementLabel] : []),
            ]

            return (
              <Card
                key={clinician}
                title={clinician}
                subtitle={status ? `${status.licenseType} — DE · ${formatDate(status.cycleStart)} – ${formatDate(status.cycleEnd)}` : undefined}
                actions={
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Plus size={14} strokeWidth={2.5} />}
                    onClick={() => setAddingFor(clinician)}
                  >
                    Log Activity
                  </Button>
                }
              >
                {!status ? (
                  <EmptyState
                    icon={<GraduationCap size={32} />}
                    title="No DE license requirement on file"
                    description="Seed Licenses_CE for this clinician to enable tracking."
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <ProgressBar
                        value={status.hoursCompleted}
                        max={status.ceHoursRequired}
                        color={CLINICIAN_COLORS[clinician]}
                        label={`Total (${status.hoursCompleted} / ${status.ceHoursRequired} hrs)`}
                        className="flex-1"
                      />
                      <div className="ml-4 shrink-0">
                        <CEStatusBadge status={status.status} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <ProgressBar
                        value={status.ethicsHoursCompleted}
                        max={status.ethicsHoursRequired}
                        size="sm"
                        label={`Ethics (${status.ethicsHoursCompleted}/${status.ethicsHoursRequired})`}
                      />
                      {status.otherSubRequirementLabel && (
                        <ProgressBar
                          value={status.otherSubRequirementHoursCompleted}
                          max={status.otherSubRequirementHours}
                          size="sm"
                          label={`${status.otherSubRequirementLabel} (${status.otherSubRequirementHoursCompleted}/${status.otherSubRequirementHours})`}
                        />
                      )}
                    </div>

                    <div className="border-t border-border pt-3">
                      {entries.length === 0 ? (
                        <p className="text-xs text-muted font-body py-2">No CE activities logged yet.</p>
                      ) : (
                        <table className="w-full text-sm font-body">
                          <tbody className="divide-y divide-gray-100">
                            {entries.map(entry => (
                              <tr
                                key={entry.rowIndex}
                                className="hover:bg-surface-sunken transition-colors cursor-pointer"
                                onClick={() => setEditing(entry)}
                              >
                                <td className="py-2 pr-3 text-ink">{entry.activityTitle}</td>
                                <td className="py-2 pr-3 text-muted text-xs whitespace-nowrap">{entry.category || '—'}</td>
                                <td className="py-2 pr-3 text-muted text-xs whitespace-nowrap">{formatDate(entry.dateCompleted)}</td>
                                <td className="py-2 text-ink text-xs text-right tabular-nums whitespace-nowrap">{entry.hours} hrs</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {addingFor === clinician && (
                  <CELogModal clinician={clinician} categoryOptions={categoryOptions} onClose={() => setAddingFor(null)} />
                )}
                {editing && editing.clinician === clinician && (
                  <CELogModal
                    clinician={clinician}
                    categoryOptions={categoryOptions}
                    record={editing}
                    onClose={() => setEditing(null)}
                  />
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
