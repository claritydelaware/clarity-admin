import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Loader2, AlertCircle, Download, AlignJustify, List } from 'lucide-react'
import type { Claim } from '../types'
import { useClaims } from '../hooks/useClaims'
import { api } from '../lib/api'
import { downloadCsv } from '../lib/utils'
import ClaimsFilters, { useClaimFilters } from '../components/claims/ClaimsFilters'
import ClaimsTable from '../components/claims/ClaimsTable'
import StatusUpdateModal from '../components/claims/StatusUpdateModal'
import { SkeletonTable } from '../components/ui/Skeleton'

function useDensity() {
  const [density, setDensityState] = useState<'comfortable' | 'compact'>(() => {
    try { return (localStorage.getItem('claimsTableDensity') as 'comfortable' | 'compact') ?? 'comfortable' }
    catch { return 'comfortable' }
  })
  const setDensity = (d: 'comfortable' | 'compact') => {
    setDensityState(d)
    try { localStorage.setItem('claimsTableDensity', d) } catch { /* noop */ }
  }
  return { density, setDensity }
}

export default function Claims() {
  const filters = useClaimFilters()
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)
  const [exporting, setExporting] = useState(false)
  const { density, setDensity } = useDensity()

  const apiFilter = {
    clinician:   filters.clinician   || undefined,
    payer:       filters.payer       || undefined,
    status:      filters.status      || undefined,
    serviceCode: filters.serviceCode || undefined,
    from:        filters.from        || undefined,
    to:          filters.to          || undefined,
  }

  const { data: claims, isLoading, isError, error } = useClaims(apiFilter)

  const search = (filters.search ?? '').toLowerCase().trim()
  const displayed = claims && search
    ? claims.filter(c =>
        (c.claimId ?? '').toLowerCase().includes(search) ||
        (c.notes ?? '').toLowerCase().includes(search)
      )
    : claims

  const handleExport = async () => {
    setExporting(true)
    try {
      const rows = await api.claims.exportRaw()
      downloadCsv(rows, `claims-${new Date().toISOString().slice(0, 10)}.csv`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-heading text-xl font-semibold text-ink">Claims</h1>
        <div className="flex items-center gap-2">
          {/* Density toggle */}
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <button
              type="button"
              title="Comfortable density"
              onClick={() => setDensity('comfortable')}
              className={[
                'p-2 transition-colors',
                density === 'comfortable' ? 'bg-teal-pale text-teal' : 'text-muted hover:bg-gray-50',
              ].join(' ')}
            >
              <AlignJustify size={14} />
            </button>
            <button
              type="button"
              title="Compact density"
              onClick={() => setDensity('compact')}
              className={[
                'p-2 transition-colors border-l border-gray-200',
                density === 'compact' ? 'bg-teal-pale text-teal' : 'text-muted hover:bg-gray-50',
              ].join(' ')}
            >
              <List size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-body text-muted border border-gray-200 rounded hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export CSV
          </button>
          <Link
            to="/claims/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal text-white text-sm font-body rounded hover:bg-teal-mid transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            <Plus size={15} strokeWidth={2.5} />
            New Claim
          </Link>
        </div>
      </div>

      <ClaimsFilters />

      {isLoading && <SkeletonTable rows={10} />}

      {isError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-error font-body">
          <AlertCircle size={16} className="shrink-0" />
          {(error as Error).message}
        </div>
      )}

      {displayed && (
        <ClaimsTable claims={displayed} onStatusClick={setSelectedClaim} compact={density === 'compact'} />
      )}

      {selectedClaim && (
        <StatusUpdateModal
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}
    </div>
  )
}
