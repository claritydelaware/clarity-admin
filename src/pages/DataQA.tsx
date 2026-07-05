import { Link } from 'react-router-dom'
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react'
import { useDataQA } from '../hooks/useDataQA'
import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorBanner from '../components/ui/ErrorBanner'
import EmptyState from '../components/ui/EmptyState'
import type { QaAnomalyRule } from '../types'

function SeverityTag({ severity }: { severity: 'error' | 'warning' }) {
  const isError = severity === 'error'
  return (
    <span className={[
      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium font-ui',
      isError ? 'bg-red-50 text-error' : 'bg-amber-50 text-amber-700',
    ].join(' ')}>
      {isError ? <ShieldAlert size={12} /> : <AlertTriangle size={12} />}
      {isError ? 'Error' : 'Warning'}
    </span>
  )
}

function RuleCard({ rule }: { rule: QaAnomalyRule }) {
  return (
    <Card
      title={rule.rule}
      subtitle={`${rule.claims.length} claim${rule.claims.length !== 1 ? 's' : ''} flagged`}
      actions={<SeverityTag severity={rule.severity} />}
      padding="none"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-body min-w-[500px]">
          <thead className="bg-surface-sunken border-b border-border">
            <tr>
              <th className="px-5 py-2.5 text-left text-xs font-medium font-ui text-muted uppercase tracking-wide">Claim</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium font-ui text-muted uppercase tracking-wide">Client ID</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium font-ui text-muted uppercase tracking-wide">Detail</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rule.claims.map(c => (
              <tr key={c.rowIndex} className="hover:bg-surface-sunken transition-colors">
                <td className="px-5 py-2.5 text-ink font-medium">{c.claimId || `Row ${c.rowIndex}`}</td>
                <td className="px-4 py-2.5 text-muted">{c.clientId}</td>
                <td className="px-4 py-2.5 text-muted">{c.detail}</td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    to={`/claims?edit=${c.rowIndex}&claimId=${encodeURIComponent(c.claimId ?? '')}`}
                    className="text-teal hover:text-teal-mid text-xs font-ui font-medium whitespace-nowrap"
                  >
                    Fix →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default function DataQA() {
  const { data: rules, isLoading, isError, error, refetch } = useDataQA()

  if (isLoading) return <LoadingSpinner size={20} label="Scanning claims for anomalies…" />
  if (isError) return <ErrorBanner message={(error as Error).message} onRetry={() => refetch()} />

  const errorCount = rules?.filter(r => r.severity === 'error').reduce((s, r) => s + r.claims.length, 0) ?? 0
  const warningCount = rules?.filter(r => r.severity === 'warning').reduce((s, r) => s + r.claims.length, 0) ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data QA"
        subtitle={
          rules && rules.length > 0
            ? `${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warningCount} warning${warningCount !== 1 ? 's' : ''} across ${rules.length} rule${rules.length !== 1 ? 's' : ''}`
            : undefined
        }
      />

      {(!rules || rules.length === 0) && (
        <EmptyState
          icon={<ShieldCheck size={40} />}
          title="No anomalies found"
          description="All claims passed the data integrity checks."
        />
      )}

      {rules?.map(rule => <RuleCard key={rule.rule} rule={rule} />)}
    </div>
  )
}
