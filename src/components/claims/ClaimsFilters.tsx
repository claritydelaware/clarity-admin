import { useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { CLINICIANS, KNOWN_PAYERS, CLAIM_STATUSES, SERVICE_CODES } from '../../types'

export interface ActiveFilters {
  clinician: string
  payer: string
  status: string
  serviceCode: string
  from: string
  to: string
  search: string
}

export function useClaimFilters(): ActiveFilters {
  const [sp] = useSearchParams()
  return {
    clinician:   sp.get('clinician')   ?? '',
    payer:       sp.get('payer')       ?? '',
    status:      sp.get('status')      ?? '',
    serviceCode: sp.get('serviceCode') ?? '',
    from:        sp.get('from')        ?? '',
    to:          sp.get('to')          ?? '',
    search:      sp.get('search')      ?? '',
  }
}

export default function ClaimsFilters() {
  const [sp, setSp] = useSearchParams()

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(sp)
    if (value) next.set(key, value)
    else next.delete(key)
    setSp(next, { replace: true })
  }

  const clear = () => setSp({}, { replace: true })
  const hasFilters = [...sp.keys()].length > 0

  const selectClass =
    'h-8 rounded border border-gray-200 bg-white px-2 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={sp.get('search') ?? ''}
        onChange={e => set('search', e.target.value)}
        placeholder="Search claims…"
        className={`${selectClass} w-44 placeholder:text-muted`}
      />

      <select
        value={sp.get('clinician') ?? ''}
        onChange={e => set('clinician', e.target.value)}
        className={selectClass}
      >
        <option value="">All Clinicians</option>
        {CLINICIANS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <select
        value={sp.get('payer') ?? ''}
        onChange={e => set('payer', e.target.value)}
        className={selectClass}
      >
        <option value="">All Payers</option>
        {KNOWN_PAYERS.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      <select
        value={sp.get('status') ?? ''}
        onChange={e => set('status', e.target.value)}
        className={selectClass}
      >
        <option value="">All Statuses</option>
        {CLAIM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <select
        value={sp.get('serviceCode') ?? ''}
        onChange={e => set('serviceCode', e.target.value)}
        className={selectClass}
      >
        <option value="">All Codes</option>
        {SERVICE_CODES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <input
        type="date"
        value={sp.get('from') ?? ''}
        onChange={e => set('from', e.target.value)}
        className={selectClass}
        title="From date"
      />
      <input
        type="date"
        value={sp.get('to') ?? ''}
        onChange={e => set('to', e.target.value)}
        className={selectClass}
        title="To date"
      />

      {hasFilters && (
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 h-8 px-2 text-xs text-muted hover:text-error font-body transition-colors"
        >
          <X size={13} /> Clear
        </button>
      )}
    </div>
  )
}
