import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useStaff } from '../hooks/useStaff'
import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorBanner from '../components/ui/ErrorBanner'
import EmptyState from '../components/ui/EmptyState'
import type { StaffMember } from '../types'

function licenseStatus(member: StaffMember): 'ok' | 'warning' | 'expired' | null {
  if (!member.licenseExpiration) return null
  const exp = new Date(member.licenseExpiration)
  const now = new Date()
  const daysUntil = Math.floor((exp.getTime() - now.getTime()) / 86400000)
  if (daysUntil < 0) return 'expired'
  if (daysUntil <= 90) return 'warning'
  return 'ok'
}

function RoleBadge({ role }: { role: 'partner' | 'w2' }) {
  return (
    <span className={[
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-ui',
      role === 'partner' ? 'bg-teal-pale text-teal' : 'bg-gold-tint text-gold-dark',
    ].join(' ')}>
      {role === 'partner' ? 'Partner' : 'W-2'}
    </span>
  )
}

export default function Staff() {
  const navigate = useNavigate()
  const { data: staff, isLoading, isError, error } = useStaff()

  return (
    <div className="space-y-4">
      <PageHeader
        title="Staff"
        actions={
          <Button icon={<Plus size={15} strokeWidth={2.5} />} onClick={() => navigate('/staff/new')}>
            Add Staff
          </Button>
        }
      />

      {isLoading && <LoadingSpinner label="Loading staff…" />}
      {isError && <ErrorBanner message={(error as Error).message} />}

      {staff && (
        <Card padding="none">
          <table className="w-full text-sm font-body">
            <thead className="bg-surface-sunken border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium font-ui text-muted uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium font-ui text-muted uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium font-ui text-muted uppercase tracking-wide">License</th>
                <th className="px-4 py-3 text-left text-xs font-medium font-ui text-muted uppercase tracking-wide">Expiration</th>
                <th className="px-4 py-3 text-left text-xs font-medium font-ui text-muted uppercase tracking-wide">Compensation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState title="No staff records" description="Add the first one above." />
                  </td>
                </tr>
              )}
              {staff.map(member => {
                const lStatus = licenseStatus(member)
                return (
                  <tr key={member.id} className="hover:bg-surface-sunken transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        to={`/staff/${member.id}`}
                        className="flex items-center gap-2 font-medium text-ink hover:text-teal transition-colors"
                      >
                        <Avatar name={member.name} size="sm" />
                        {member.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={member.role} />
                    </td>
                    <td className="px-4 py-3 text-muted">{member.licenseType}</td>
                    <td className="px-4 py-3">
                      {member.licenseExpiration ? (
                        <span className={[
                          'text-sm',
                          lStatus === 'expired' ? 'text-error font-medium' :
                          lStatus === 'warning' ? 'text-amber-600 font-medium' : 'text-muted',
                        ].join(' ')}>
                          {new Date(member.licenseExpiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {lStatus === 'expired' && ' — Expired'}
                          {lStatus === 'warning' && ' — Expiring soon'}
                        </span>
                      ) : (
                        <span className="text-muted text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted capitalize">{member.compensationType.replace('-', ' ')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
