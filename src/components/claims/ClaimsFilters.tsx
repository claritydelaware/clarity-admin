import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { X, Bookmark, ChevronDown } from 'lucide-react'
import { CLINICIANS, KNOWN_PAYERS, CLAIM_STATUSES, SERVICE_CODES } from '../../types'
import useLocalStorage from '../../hooks/useLocalStorage'

const MAX_PRESETS = 8

interface Preset { name: string; params: string }

export interface ActiveFilters {
  clinician: string
  payer: string
  status: string
  serviceCode: string
  from: string
  to: string
  search: string
  clientId: string
  dateField: 'claimDate' | 'paymentDate'
  pendingCollection: boolean
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
    clientId:    sp.get('clientId')    ?? '',
    dateField:   (sp.get('dateField') as 'claimDate' | 'paymentDate') || 'claimDate',
    pendingCollection: sp.get('pendingCollection') === '1',
  }
}

export default function ClaimsFilters() {
  const [sp, setSp] = useSearchParams()
  const [presets, setPresets] = useLocalStorage<Preset[]>('claimsFilterPresets', [])
  const [saving, setSaving] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [statusOpen, setStatusOpen] = useState(false)
  const [clinicianOpen, setClinicianOpen] = useState(false)
  const [payerOpen, setPayerOpen] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const statusPopoverRef = useRef<HTMLDivElement>(null)
  const clinicianPopoverRef = useRef<HTMLDivElement>(null)
  const payerPopoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (saving) nameInputRef.current?.focus()
  }, [saving])

  useEffect(() => {
    if (!statusOpen) return
    function handleClick(e: MouseEvent) {
      if (!statusPopoverRef.current?.contains(e.target as Node)) setStatusOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [statusOpen])

  useEffect(() => {
    if (!clinicianOpen) return
    function handleClick(e: MouseEvent) {
      if (!clinicianPopoverRef.current?.contains(e.target as Node)) setClinicianOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [clinicianOpen])

  useEffect(() => {
    if (!payerOpen) return
    function handleClick(e: MouseEvent) {
      if (!payerPopoverRef.current?.contains(e.target as Node)) setPayerOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [payerOpen])

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(sp)
    if (value) next.set(key, value)
    else next.delete(key)
    setSp(next, { replace: true })
  }

  const clear = () => setSp({}, { replace: true })

  // Non-default = any param other than an empty string
  const hasFilters = [...sp.entries()].some(([, v]) => Boolean(v))
  const currentParams = sp.toString()

  const addPreset = () => {
    if (!presetName.trim()) return
    const next = [
      ...presets.filter(p => p.name !== presetName.trim()),
      { name: presetName.trim(), params: currentParams },
    ].slice(-MAX_PRESETS)
    setPresets(next)
    setPresetName('')
    setSaving(false)
  }

  const removePreset = (name: string) => {
    setPresets(presets.filter(p => p.name !== name))
  }

  const applyPreset = (params: string) => {
    setSp(new URLSearchParams(params), { replace: true })
  }

  const selectedStatuses = (sp.get('status') ?? '').split(',').filter(Boolean)
  const statusLabel = selectedStatuses.length === 0
    ? 'All Statuses'
    : `${selectedStatuses.length} status${selectedStatuses.length > 1 ? 'es' : ''}`

  const toggleStatus = (s: string) => {
    const next = selectedStatuses.includes(s)
      ? selectedStatuses.filter(x => x !== s)
      : [...selectedStatuses, s]
    set('status', next.join(','))
  }

  const selectedClinicians = (sp.get('clinician') ?? '').split(',').filter(Boolean)
  const clinicianLabel = selectedClinicians.length === 0
    ? 'All Clinicians'
    : selectedClinicians.length === 1
      ? selectedClinicians[0]
      : `${selectedClinicians.length} clinicians`

  const toggleClinician = (c: string) => {
    const next = selectedClinicians.includes(c)
      ? selectedClinicians.filter(x => x !== c)
      : [...selectedClinicians, c]
    set('clinician', next.join(','))
  }

  const selectedPayers = (sp.get('payer') ?? '').split(',').filter(Boolean)
  const payerLabel = selectedPayers.length === 0
    ? 'All Payers'
    : selectedPayers.length === 1
      ? selectedPayers[0]
      : `${selectedPayers.length} payers`

  const togglePayer = (p: string) => {
    const next = selectedPayers.includes(p)
      ? selectedPayers.filter(x => x !== p)
      : [...selectedPayers, p]
    set('payer', next.join(','))
  }

  const selectClass =
    'h-8 rounded border border-gray-200 bg-white px-2 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent'

  return (
    <div className="space-y-2">
      {/* Preset pills */}
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map(p => (
            <span key={p.name} className="inline-flex items-center gap-1 bg-teal-pale text-teal text-xs font-body rounded-full px-2.5 py-1">
              <button onClick={() => applyPreset(p.params)} className="hover:underline">{p.name}</button>
              <button
                onClick={() => removePreset(p.name)}
                className="text-teal/60 hover:text-error transition-colors ml-0.5"
                aria-label={`Remove preset ${p.name}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={sp.get('search') ?? ''}
          onChange={e => set('search', e.target.value)}
          placeholder="Search claims…"
          className={`${selectClass} w-44 placeholder:text-muted`}
        />

        <input
          type="search"
          value={sp.get('clientId') ?? ''}
          onChange={e => set('clientId', e.target.value)}
          placeholder="Client ID…"
          className={`${selectClass} w-36 placeholder:text-muted`}
        />

        <div className="relative" ref={clinicianPopoverRef}>
          <button
            type="button"
            onClick={() => setClinicianOpen(o => !o)}
            className={[
              selectClass,
              'inline-flex items-center gap-1.5 cursor-pointer',
              selectedClinicians.length > 0 ? 'border-teal text-teal' : '',
            ].join(' ')}
          >
            {clinicianLabel}
            <ChevronDown size={12} className="opacity-50 shrink-0" />
          </button>
          {clinicianOpen && (
            <div className="absolute z-20 top-9 left-0 bg-white border border-gray-200 rounded-lg shadow-md py-1 min-w-40">
              {CLINICIANS.map(c => (
                <label
                  key={c}
                  className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm font-body text-ink"
                >
                  <input
                    type="checkbox"
                    checked={selectedClinicians.includes(c)}
                    onChange={() => toggleClinician(c)}
                    className="rounded border-gray-300 accent-teal"
                  />
                  {c}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={payerPopoverRef}>
          <button
            type="button"
            onClick={() => setPayerOpen(o => !o)}
            className={[
              selectClass,
              'inline-flex items-center gap-1.5 cursor-pointer',
              selectedPayers.length > 0 ? 'border-teal text-teal' : '',
            ].join(' ')}
          >
            {payerLabel}
            <ChevronDown size={12} className="opacity-50 shrink-0" />
          </button>
          {payerOpen && (
            <div className="absolute z-20 top-9 left-0 bg-white border border-gray-200 rounded-lg shadow-md py-1 min-w-48 max-h-64 overflow-y-auto">
              {KNOWN_PAYERS.map(p => (
                <label
                  key={p}
                  className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm font-body text-ink"
                >
                  <input
                    type="checkbox"
                    checked={selectedPayers.includes(p)}
                    onChange={() => togglePayer(p)}
                    className="rounded border-gray-300 accent-teal"
                  />
                  {p}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={statusPopoverRef}>
          <button
            type="button"
            onClick={() => setStatusOpen(o => !o)}
            className={[
              selectClass,
              'inline-flex items-center gap-1.5 cursor-pointer',
              selectedStatuses.length > 0 ? 'border-teal text-teal' : '',
            ].join(' ')}
          >
            {statusLabel}
            <ChevronDown size={12} className="opacity-50 shrink-0" />
          </button>
          {statusOpen && (
            <div className="absolute z-20 top-9 left-0 bg-white border border-gray-200 rounded-lg shadow-md py-1 min-w-48">
              {CLAIM_STATUSES.map(s => (
                <label
                  key={s}
                  className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm font-body text-ink"
                >
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(s)}
                    onChange={() => toggleStatus(s)}
                    className="rounded border-gray-300 accent-teal"
                  />
                  {s}
                </label>
              ))}
            </div>
          )}
        </div>

        <select value={sp.get('serviceCode') ?? ''} onChange={e => set('serviceCode', e.target.value)} className={selectClass}>
          <option value="">All Codes</option>
          {SERVICE_CODES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <input type="date" value={sp.get('from') ?? ''} onChange={e => set('from', e.target.value)} className={selectClass} title="From date" />
        <input type="date" value={sp.get('to') ?? ''}   onChange={e => set('to', e.target.value)}   className={selectClass} title="To date" />

        <label className="inline-flex items-center gap-1.5 text-xs font-body text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={(sp.get('dateField') ?? 'claimDate') === 'paymentDate'}
            onChange={e => set('dateField', e.target.checked ? 'paymentDate' : '')}
            className="rounded border-gray-300 accent-teal"
          />
          Payment Date
        </label>

        <label className="inline-flex items-center gap-1.5 text-xs font-body text-muted cursor-pointer select-none" title="Show only claims with outstanding copay/coinsurance">
          <input
            type="checkbox"
            checked={sp.get('pendingCollection') === '1'}
            onChange={e => set('pendingCollection', e.target.checked ? '1' : '')}
            className="rounded border-gray-300 accent-teal"
          />
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-error inline-block" />
            Pending Collection
          </span>
        </label>

        {hasFilters && !saving && (
          <button
            type="button"
            onClick={() => { setSaving(true); setPresetName('') }}
            className="inline-flex items-center gap-1 h-8 px-2 text-xs text-muted hover:text-teal font-body transition-colors border border-dashed border-gray-200 rounded"
            disabled={presets.length >= MAX_PRESETS}
            title="Save filter preset"
          >
            <Bookmark size={12} /> Save
          </button>
        )}

        {saving && (
          <div className="flex items-center gap-1">
            <input
              ref={nameInputRef}
              type="text"
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') addPreset()
                if (e.key === 'Escape') setSaving(false)
              }}
              placeholder="Preset name…"
              className={`${selectClass} w-32`}
            />
            <button
              onClick={addPreset}
              className="h-8 px-2 text-xs font-body text-teal border border-teal rounded hover:bg-teal-pale transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => setSaving(false)}
              className="h-8 px-2 text-xs font-body text-muted hover:text-ink transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        )}

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
    </div>
  )
}
