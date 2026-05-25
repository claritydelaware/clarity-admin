import { Link, useNavigate } from 'react-router-dom'
import { Plus, Loader2, AlertCircle, User } from 'lucide-react'
import { useStaff } from '../hooks/useStaff'
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
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-body',
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
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold text-ink">Staff</h1>
        <button
          onClick={() => navigate('/staff/new')}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal text-white text-sm font-body rounded hover:bg-teal-mid transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          <Plus size={15} strokeWidth={2.5} />
          Add Staff
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted">
          <Loader2 size={20} className="animate-spin mr-2" />
          <span className="text-sm font-body">Loading staff…</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-error font-body">
          <AlertCircle size={16} className="shrink-0" />
          {(error as Error).message}
        </div>
      )}

      {staff && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm font-body">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">License</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Expiration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">Compensation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted text-sm">
                    No staff records. Add the first one above.
                  </td>
                </tr>
              )}
              {staff.map(member => {
                const lStatus = licenseStatus(member)
                return (
                  <tr key={member.id} className="hover:bg-cream transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        to={`/staff/${member.id}`}
                        className="flex items-center gap-2 font-medium text-ink hover:text-teal transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-teal-pale flex items-center justify-center shrink-0">
                          <User size={13} className="text-teal" />
                        </div>
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
        </div>
      )}
    </div>
  )
}
