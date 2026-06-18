import { useState, useMemo } from 'react'
import {
  Plus, X, TrendingUp, Users, Activity, DollarSign,
  ChevronUp, ChevronDown, ChevronsUpDown, Search, ExternalLink,
} from 'lucide-react'
import { useCaseloads, useCaseloadAnalysis, useCreateCaseload } from '../hooks/useClaims'
import { CLINICIANS, type Clinician, type CaseloadClientStat } from '../types'
import { SkeletonTable, SkeletonMetricCards } from '../components/ui/Skeleton'
import { PayerBadge } from '../components/ui/Badge'

type Tab          = 'All' | Clinician
type SortKey      = 'index' | 'clinician' | 'status' | 'lastVisit' | 'sessions' | 'payer' | 'revenue' | 'avgDays'
type SortDir      = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'dormant'

function fmt(date: string): string {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={12} className="text-gray-300 ml-1 shrink-0" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-teal ml-1 shrink-0" />
    : <ChevronDown size={12} className="text-teal ml-1 shrink-0" />
}

export default function Caseloads() {
  const { data: caseloads = [], isLoading: loadingRoster } = useCaseloads()
  const { data: analysis = [], isLoading: loadingAnalysis } = useCaseloadAnalysis()
  const createMutation = useCreateCaseload()

  // ── filters ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState<Tab>('All')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch]             = useState('')
  const [payerFilter, setPayerFilter]   = useState('')

  // ── sort ────────────────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>('lastVisit')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // ── add-client form ─────────────────────────────────────────────────────────
  const [showForm, setShowForm]   = useState(false)
  const [newClientId, setNewClientId] = useState('')
  const [newClinician, setNewClinician] = useState<Clinician>('Shannon')

  // ── derived data ─────────────────────────────────────────────────────────────
  const statMap = useMemo(
    () => new Map<string, CaseloadClientStat>(analysis.map(s => [s.clientId, s])),
    [analysis],
  )

  // Total per clinician — used for tab badges
  const counts = useMemo(() => CLINICIANS.reduce((acc, name) => {
    acc[name] = caseloads.filter(c => c.clinician === name).length
    return acc
  }, {} as Record<Clinician, number>), [caseloads])

  // Active-only per clinician — used for the summary cards
  const activeCounts = useMemo(() => CLINICIANS.reduce((acc, name) => {
    acc[name] = caseloads.filter(c => c.clinician === name && statMap.get(c.clientId)?.isActive).length
    return acc
  }, {} as Record<Clinician, number>), [caseloads, statMap])

  const uniquePayers = useMemo(
    () => [...new Set(analysis.map(s => s.primaryPayer).filter(Boolean))].sort(),
    [analysis],
  )

  const rosterIds = useMemo(() => new Set(caseloads.map(c => c.clientId)), [caseloads])
  const rosterStats = useMemo(() => analysis.filter(s => rosterIds.has(s.clientId)), [analysis, rosterIds])

  const activeCount   = rosterStats.filter(s => s.isActive).length
  const dormantCount  = rosterStats.filter(s => !s.isActive).length
  const totalSessions = rosterStats.reduce((sum, s) => sum + s.sessionCount, 0)
  const avgSessions   = rosterStats.length > 0 ? totalSessions / rosterStats.length : 0
  const totalRevenue  = rosterStats.reduce((sum, s) => sum + s.totalRevenue, 0)
  const avgRevenue    = rosterStats.length > 0 ? totalRevenue / rosterStats.length : 0

  // Annotate with original roster index before filtering/sorting
  const indexed = useMemo(() => caseloads.map((c, i) => ({ ...c, rosterIndex: i })), [caseloads])

  const filtered = useMemo(() => {
    let rows = activeTab === 'All' ? indexed : indexed.filter(c => c.clinician === activeTab)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(c => c.clientId.toLowerCase().includes(q))
    }

    if (statusFilter !== 'all') {
      rows = rows.filter(c => {
        const s = statMap.get(c.clientId)
        if (!s) return false
        return statusFilter === 'active' ? s.isActive : !s.isActive
      })
    }

    if (payerFilter) {
      rows = rows.filter(c => statMap.get(c.clientId)?.primaryPayer === payerFilter)
    }

    rows = [...rows].sort((a, b) => {
      const sa = statMap.get(a.clientId)
      const sb = statMap.get(b.clientId)
      let cmp = 0

      switch (sortKey) {
        case 'index':
          cmp = a.rosterIndex - b.rosterIndex
          break
        case 'clinician':
          cmp = a.clinician.localeCompare(b.clinician)
          break
        case 'status': {
          const va = sa?.isActive ? 1 : 0
          const vb = sb?.isActive ? 1 : 0
          cmp = vb - va
          break
        }
        case 'lastVisit': {
          const ma = sa?.lastSessionDate ? new Date(sa.lastSessionDate).getTime() : 0
          const mb = sb?.lastSessionDate ? new Date(sb.lastSessionDate).getTime() : 0
          cmp = ma - mb
          break
        }
        case 'sessions':
          cmp = (sa?.sessionCount ?? 0) - (sb?.sessionCount ?? 0)
          break
        case 'payer':
          cmp = (sa?.primaryPayer ?? '').localeCompare(sb?.primaryPayer ?? '')
          break
        case 'revenue':
          cmp = (sa?.totalRevenue ?? 0) - (sb?.totalRevenue ?? 0)
          break
        case 'avgDays':
          cmp = (sa?.avgDaysToPayment ?? Infinity) - (sb?.avgDaysToPayment ?? Infinity)
          break
      }

      return sortDir === 'asc' ? cmp : -cmp
    })

    return rows
  }, [indexed, activeTab, search, statusFilter, payerFilter, sortKey, sortDir, statMap])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filtersActive = search || statusFilter !== 'all' || payerFilter

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setPayerFilter('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newClientId.trim()) return
    await createMutation.mutateAsync({ clientId: newClientId.trim(), clinician: newClinician })
    setNewClientId('')
    setShowForm(false)
  }

  const isLoading = loadingRoster || loadingAnalysis

  const thClass = (key: SortKey, align: 'left' | 'right' = 'left') =>
    `px-4 py-3 text-xs font-ui uppercase tracking-wide cursor-pointer select-none hover:text-teal transition-colors text-${align} ${sortKey === key ? 'text-teal' : 'text-muted'}`

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl text-teal">Caseloads</h1>
          <p className="text-sm text-muted mt-0.5">
            {loadingRoster ? '—' : `${caseloads.length} registered clients`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-teal text-white text-sm rounded-lg hover:bg-teal-mid transition-colors"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? 'Cancel' : 'Add Client'}
        </button>
      </div>

      {/* Stats row: clinician active counts + aggregate analytics */}
      {isLoading ? (
        <div className="mb-6"><SkeletonMetricCards /></div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
          {/* Left panel: clinician active counts */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-muted font-ui uppercase tracking-wide mb-4">Active Clients by Clinician</p>
            <div className="grid grid-cols-4 gap-4">
              {CLINICIANS.map(name => (
                <div key={name}>
                  <p className="text-xs text-muted font-ui uppercase tracking-wide">{name}</p>
                  <p className="text-2xl font-heading text-teal mt-1">{activeCounts[name]}</p>
                  <p className="text-xs text-muted">active</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: aggregate stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-muted font-ui uppercase tracking-wide mb-4">Practice Overview</p>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity size={13} className="text-green-600" />
                  <p className="text-xs text-muted font-ui uppercase tracking-wide">Active (30d)</p>
                </div>
                <p className="text-2xl font-heading text-teal">{activeCount}</p>
                <p className="text-xs text-muted">{caseloads.length > 0 ? Math.round(activeCount / caseloads.length * 100) : 0}% of caseload</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Users size={13} className="text-muted" />
                  <p className="text-xs text-muted font-ui uppercase tracking-wide">Dormant</p>
                </div>
                <p className="text-2xl font-heading text-teal">{dormantCount}</p>
                <p className="text-xs text-muted">no visit in 30d</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={13} className="text-teal-mid" />
                  <p className="text-xs text-muted font-ui uppercase tracking-wide">Avg Sessions</p>
                </div>
                <p className="text-2xl font-heading text-teal">{avgSessions.toFixed(1)}</p>
                <p className="text-xs text-muted">per client lifetime</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign size={13} className="text-gold-dark" />
                  <p className="text-xs text-muted font-ui uppercase tracking-wide">Avg Revenue</p>
                </div>
                <p className="text-2xl font-heading text-teal">{fmtCurrency(avgRevenue)}</p>
                <p className="text-xs text-muted">per client lifetime</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-primary mb-3">Add client to caseload</p>
          <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-muted mb-1">Client ID</label>
              <input
                type="text"
                value={newClientId}
                onChange={e => setNewClientId(e.target.value)}
                placeholder="e.g. fdcdd28fa306771e"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Clinician</label>
              <select
                value={newClinician}
                onChange={e => setNewClinician(e.target.value as Clinician)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal"
              >
                {CLINICIANS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending || !newClientId.trim()}
              className="px-4 py-2 bg-teal text-white text-sm rounded-lg hover:bg-teal-mid transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Adding…' : 'Add'}
            </button>
          </form>
        </div>
      )}

      {/* Clinician tabs + filter bar */}
      <div className="flex flex-col gap-3 mb-4">
        {/* Clinician tabs */}
        <div className="flex flex-wrap gap-1">
          {(['All', ...CLINICIANS] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                activeTab === tab
                  ? 'bg-teal text-white font-medium'
                  : 'text-muted hover:bg-gray-100',
              ].join(' ')}
            >
              {tab}
              <span className="ml-1.5 text-xs opacity-70">
                {tab === 'All' ? caseloads.length : counts[tab as Clinician]}
              </span>
            </button>
          ))}
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search client ID…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal w-48 font-mono"
            />
          </div>

          {/* Status filter */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['all', 'active', 'dormant'] as StatusFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={[
                  'px-3 py-1.5 text-sm transition-colors capitalize',
                  statusFilter === f
                    ? 'bg-teal text-white font-medium'
                    : 'bg-white text-muted hover:bg-gray-50',
                ].join(' ')}
              >
                {f === 'all' ? 'All statuses' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Payer filter */}
          <select
            value={payerFilter}
            onChange={e => setPayerFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal text-muted"
          >
            <option value="">All payers</option>
            {uniquePayers.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Clear filters */}
          {filtersActive && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted hover:text-teal border border-gray-200 rounded-lg hover:border-teal/30 transition-colors"
            >
              <X size={11} />
              Clear
            </button>
          )}

          {/* Result count when filtered */}
          {filtersActive && (
            <span className="text-xs text-muted ml-1">
              {filtered.length} of {caseloads.length}
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <SkeletonTable rows={10} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">No clients match the current filters.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th
                    className={thClass('index')}
                    onClick={() => toggleSort('index')}
                  >
                    <span className="inline-flex items-center">
                      #<SortIcon col="index" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-xs text-muted font-ui uppercase tracking-wide text-left">
                    Client ID
                  </th>
                  <th
                    className={thClass('clinician')}
                    onClick={() => toggleSort('clinician')}
                  >
                    <span className="inline-flex items-center">
                      Clinician<SortIcon col="clinician" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                  <th
                    className={thClass('status')}
                    onClick={() => toggleSort('status')}
                  >
                    <span className="inline-flex items-center">
                      Status<SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                  <th
                    className={thClass('lastVisit')}
                    onClick={() => toggleSort('lastVisit')}
                  >
                    <span className="inline-flex items-center">
                      Last Visit<SortIcon col="lastVisit" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                  <th
                    className={thClass('sessions', 'right')}
                    onClick={() => toggleSort('sessions')}
                  >
                    <span className="inline-flex items-center justify-end w-full">
                      Sessions<SortIcon col="sessions" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                  <th
                    className={thClass('payer')}
                    onClick={() => toggleSort('payer')}
                  >
                    <span className="inline-flex items-center">
                      Primary Payer<SortIcon col="payer" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                  <th
                    className={thClass('revenue', 'right')}
                    onClick={() => toggleSort('revenue')}
                  >
                    <span className="inline-flex items-center justify-end w-full">
                      Revenue<SortIcon col="revenue" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                  <th
                    className={thClass('avgDays', 'right')}
                    onClick={() => toggleSort('avgDays')}
                  >
                    <span className="inline-flex items-center justify-end w-full">
                      Avg Days to Pay<SortIcon col="avgDays" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => {
                  const stat = statMap.get(entry.clientId)
                  return (
                    <tr
                      key={`${entry.clientId}-${i}`}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-muted">{i + 1}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://secure.simplepractice.com/clients/${entry.clientId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono text-teal bg-teal-pale/60 px-2 py-0.5 rounded hover:bg-teal-pale transition-colors"
                        >
                          {entry.clientId}
                          <ExternalLink size={10} className="shrink-0 opacity-60" />
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-primary">{entry.clinician}</td>
                      <td className="px-4 py-3">
                        {stat ? (
                          <span className={[
                            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium',
                            stat.isActive
                              ? 'bg-green-50 border border-green-200 text-green-700'
                              : 'bg-gray-100 border border-gray-200 text-muted',
                          ].join(' ')}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stat.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {stat.isActive ? 'Active' : 'Dormant'}
                          </span>
                        ) : <span className="text-sm text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-primary">
                        {stat ? fmt(stat.lastSessionDate) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-primary text-right tabular-nums">
                        {stat ? stat.sessionCount : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {stat?.primaryPayer
                          ? <PayerBadge payer={stat.primaryPayer} />
                          : <span className="text-sm text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-primary text-right tabular-nums">
                        {stat ? fmtCurrency(stat.totalRevenue) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-muted">
                        {stat?.avgDaysToPayment != null ? `${stat.avgDaysToPayment}d` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
