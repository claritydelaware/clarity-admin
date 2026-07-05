import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Download, AlignJustify, List } from 'lucide-react'
import type { Claim } from '../types'
import { PAYER_GROUPS } from '../types'
import { useClaims } from '../hooks/useClaims'
import { api } from '../lib/api'
import { downloadCsv, isArchived, hasOutstandingCollection } from '../lib/utils'
import { useToast } from '../context/ToastContext'
import ClaimsFilters, { useClaimFilters } from '../components/claims/ClaimsFilters'
import ClaimsBoard from '../components/claims/ClaimsBoard'
import StatusUpdateModal from '../components/claims/StatusUpdateModal'
import DeleteClaimModal from '../components/claims/DeleteClaimModal'
import EditClaimModal from '../components/claims/EditClaimModal'
import NewClaimModal from '../components/claims/NewClaimModal'
import { SkeletonTable } from '../components/ui/Skeleton'
import PageHeader from '../components/layout/PageHeader'
import Tabs from '../components/ui/Tabs'
import Button from '../components/ui/Button'
import ErrorBanner from '../components/ui/ErrorBanner'
import useLocalStorage from '../hooks/useLocalStorage'

export default function Claims() {
  const filters = useClaimFilters()
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null)
  const [deletingClaim, setDeletingClaim] = useState<Claim | null>(null)
  const [newClaimOpen, setNewClaimOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [density, setDensity] = useLocalStorage<'comfortable' | 'compact'>('claimsTableDensity', 'comfortable')
  const [viewMode, setViewMode] = useLocalStorage<string>('claimsViewMode', 'active')

  function handleViewChange(v: string) {
    setViewMode(v)
  }

  const usePaymentDateFilter = filters.dateField === 'paymentDate'

  const apiFilter = {
    serviceCode: filters.serviceCode || undefined,
    from:        (!usePaymentDateFilter && filters.from) || undefined,
    to:          (!usePaymentDateFilter && filters.to)   || undefined,
  }

  const { data: claims, isLoading, isError, error, refetch } = useClaims(apiFilter)

  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()

  // Deep-link support: /claims?new=1 opens NewClaimModal, /claims?edit=<rowIndex>
  // opens EditClaimModal for that row. Used by the command palette and Data QA
  // page, which live outside this component and can't reach its modal state
  // directly — there is no dedicated /claims/new or /claims/:rowIndex/edit route.
  // Both params are handled in one effect (rather than two) so a URL carrying
  // both at once can't race — two effects each stripping their own param from
  // the same pre-update searchParams snapshot could otherwise re-introduce the
  // other's param and reopen the wrong modal.
  useEffect(() => {
    const wantsNew = searchParams.get('new') === '1'
    const editParam = searchParams.get('edit')
    if (!wantsNew && !editParam) return

    // rowIndex is a live Google Sheets row number that shifts when an earlier
    // row is deleted — a cached deep link (Data QA's 5-minute staleTime, or the
    // command palette) could point at a different claim by the time it's
    // clicked. Cross-check against the claimId captured at link-build time
    // rather than trusting rowIndex alone; claims without a claimId (self-pay)
    // have no better identity signal, so those fall back to trusting rowIndex.
    if (editParam) {
      if (!claims) return // wait for claims to load before resolving/stripping `edit`
      const rowIndex = parseInt(editParam, 10)
      const expectedClaimId = searchParams.get('claimId') ?? ''
      const match = claims.find(c => c.rowIndex === rowIndex)
      if (match && (!expectedClaimId || match.claimId === expectedClaimId)) {
        setEditingClaim(match)
      } else if (match && expectedClaimId) {
        toast.error('That claim may have moved — please search again')
      }
    }

    if (wantsNew) setNewClaimOpen(true)

    setSearchParams(prev => {
      prev.delete('new')
      prev.delete('edit')
      prev.delete('claimId')
      return prev
    }, { replace: true })
  }, [searchParams, claims, setSearchParams, toast])

  const search = (filters.search ?? '').toLowerCase().trim()
  const clientIdFilter = (filters.clientId ?? '').toLowerCase().trim()
  const selectedStatuses = (filters.status ?? '').split(',').filter(Boolean)
  const selectedClinicians = (filters.clinician ?? '').split(',').filter(Boolean)

  let displayed = claims ?? []
  if (viewMode === 'active') displayed = displayed.filter(c => !isArchived(c))
  if (search) displayed = displayed.filter(c =>
    (c.claimId ?? '').toLowerCase().includes(search) ||
    (c.notes ?? '').toLowerCase().includes(search)
  )
  if (clientIdFilter) displayed = displayed.filter(c =>
    (c.clientId ?? '').toLowerCase().includes(clientIdFilter)
  )
  if (selectedStatuses.length > 0) displayed = displayed.filter(c => selectedStatuses.includes(c.status))
  if (selectedClinicians.length > 0) displayed = displayed.filter(c => selectedClinicians.includes(c.clinician))
  const selectedPayers = (filters.payer ?? '').split(',').filter(Boolean)
  if (selectedPayers.length > 0) {
    const expandedPayers = new Set<string>()
    for (const p of selectedPayers) {
      expandedPayers.add(p)
      if (PAYER_GROUPS[p]) PAYER_GROUPS[p].forEach(g => expandedPayers.add(g))
    }
    displayed = displayed.filter(c => expandedPayers.has(c.insurance))
  }
  if (usePaymentDateFilter && (filters.from || filters.to)) {
    displayed = displayed.filter(c => {
      if (!c.paymentDateReceived) return false
      const pd = new Date(c.paymentDateReceived)
      if (filters.from && pd < new Date(filters.from)) return false
      if (filters.to && pd > new Date(filters.to)) return false
      return true
    })
  }
  if (filters.pendingCollection) {
    displayed = displayed.filter(hasOutstandingCollection)
  }
  const displayedOrNull = claims ? displayed : null

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
      <PageHeader
        title="Claims"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Tabs
              tabs={[
                { value: 'active', label: 'Active' },
                { value: 'all', label: 'All Claims' },
              ]}
              value={viewMode}
              onChange={handleViewChange}
              size="sm"
            />

            <div className="hidden sm:flex items-center border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                title="Comfortable density"
                onClick={() => setDensity('comfortable')}
                className={`p-2 transition-colors ${density === 'comfortable' ? 'bg-teal-pale text-teal' : 'text-muted hover:bg-surface-sunken'}`}
              >
                <AlignJustify size={14} />
              </button>
              <button
                type="button"
                title="Compact density"
                onClick={() => setDensity('compact')}
                className={`p-2 transition-colors border-l border-border ${density === 'compact' ? 'bg-teal-pale text-teal' : 'text-muted hover:bg-surface-sunken'}`}
              >
                <List size={14} />
              </button>
            </div>

            <Button variant="secondary" size="sm" onClick={handleExport} loading={exporting} icon={<Download size={14} />}>
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
            <Button size="sm" icon={<Plus size={15} strokeWidth={2.5} />} onClick={() => setNewClaimOpen(true)}>
              <span className="hidden sm:inline">New Claim</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        }
      />

      <ClaimsFilters />

      {isLoading && <SkeletonTable rows={10} />}

      {isError && (
        <ErrorBanner message={(error as Error).message} onRetry={() => refetch()} />
      )}

      {displayedOrNull && (
        <ClaimsBoard claims={displayedOrNull} onStatusClick={setSelectedClaim} onDeleteClick={setDeletingClaim} onEditClick={setEditingClaim} onAddRow={() => setNewClaimOpen(true)} compact={density === 'compact'} virtualize={viewMode === 'all'} />
      )}

      {selectedClaim && (
        <StatusUpdateModal
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}

      <NewClaimModal open={newClaimOpen} onClose={() => setNewClaimOpen(false)} />

      {editingClaim && (
        <EditClaimModal
          claim={editingClaim}
          onClose={() => setEditingClaim(null)}
        />
      )}

      {deletingClaim && (
        <DeleteClaimModal
          claim={deletingClaim}
          onClose={() => setDeletingClaim(null)}
        />
      )}
    </div>
  )
}
