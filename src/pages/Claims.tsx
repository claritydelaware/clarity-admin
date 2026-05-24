import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Loader2, AlertCircle, Download } from 'lucide-react'
import type { Claim } from '../types'
import { useClaims } from '../hooks/useClaims'
import { api } from '../lib/api'
import { downloadCsv } from '../lib/utils'
import ClaimsFilters, { useClaimFilters } from '../components/claims/ClaimsFilters'
import ClaimsTable from '../components/claims/ClaimsTable'
import StatusUpdateModal from '../components/claims/StatusUpdateModal'

export default function Claims() {
  const filters = useClaimFilters()
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)
  const [exporting, setExporting] = useState(false)

  const apiFilter = {
    clinician:   filters.clinician   || undefined,
    payer:       filters.payer       || undefined,
    status:      filters.status      || undefined,
    serviceCode: filters.serviceCode || undefined,
    from:        filters.from        || undefined,
    to:          filters.to          || undefined,
  }

  const { data: claims, isLoading, isError, error } = useClaims(apiFilter)

  // Client-side search — case-insensitive match on claimId and notes
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
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-heading text-xl font-semibold text-ink">Claims</h1>
        <div className="flex items-center gap-2">
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

      {/* Filters */}
      <ClaimsFilters />

      {/* States */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted">
          <Loader2 size={20} className="animate-spin mr-2" />
          <span className="text-sm font-body">Loading claims…</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-error font-body">
          <AlertCircle size={16} className="shrink-0" />
          {(error as Error).message}
        </div>
      )}

      {displayed && (
        <ClaimsTable claims={displayed} onStatusClick={setSelectedClaim} />
      )}

      {/* Status update modal */}
      {selectedClaim && (
        <StatusUpdateModal
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}
    </div>
  )
}
