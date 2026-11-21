import { useMemo, useRef, useState } from 'react'
import { ClipboardCheck, Copy, Pencil, Search, Upload, CheckCheck, Undo2 } from 'lucide-react'
import { useSpEntry, useImportSpEntry, useSetSpEntryDone, useSetSpEntryEft } from '../hooks/useSpEntry'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/layout/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorBanner from '../components/ui/ErrorBanner'
import EmptyState from '../components/ui/EmptyState'
import { formatCurrency } from '../lib/utils'
import type { SpEntryLine, SpEntryImportRow, SpEntryType } from '../types'

// ─── CSV import ───────────────────────────────────────────────────────────────
// Reads the parsed-ERA CSV (reporting/hho-remittances/parsed/SP_ENTRY_BY_ERA_*.csv). Own tiny parser rather
// than SheetJS: SheetJS reformats date-looking cells (9/3/2026 -> 9/3/26) and would mangle DOS values.

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some(c => c !== '')) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell)
  if (row.some(c => c !== '')) rows.push(row)
  return rows
}

const REQUIRED_COLUMNS = ['era', 'era_date', 'client_id', 'clinician', 'dos', 'cpt', 'type', 'amount_in_SP_before_this_ERA', 'amount_after_this_ERA', 'change']

function csvToImportRows(text: string): SpEntryImportRow[] {
  const [header, ...body] = parseCsv(text.replace(/^\uFEFF/, ''))
  if (!header) throw new Error('The file is empty')
  const missing = REQUIRED_COLUMNS.filter(c => !header.includes(c))
  if (missing.length) throw new Error(`Missing columns: ${missing.join(', ')}`)
  const col = (r: string[], name: string) => (r[header.indexOf(name)] ?? '').trim()
  return body.map((r, i) => {
    const flags = col(r, 'flags')
    const rawType = col(r, 'type')
    const type: SpEntryType = rawType === 'denied' ? 'denied'
      : rawType === 'offset' ? 'offset'
      : rawType === 'unchanged' || flags.includes('re-issued unchanged') ? 'unchanged'
      : rawType === 'reprocessed' ? 'reprocessed' : 'new'
    const before = col(r, 'amount_in_SP_before_this_ERA')
    const afterRaw = parseFloat(col(r, 'amount_after_this_ERA')), change = parseFloat(col(r, 'change'))
    // A recoup on a claim with several lines has no single result; keep the change, store 0 for the result.
    const enter = Number.isNaN(afterRaw) && type === 'offset' ? 0 : afterRaw
    if (!col(r, 'era') || !col(r, 'client_id') || Number.isNaN(enter) || Number.isNaN(change)) {
      throw new Error(`Line ${i + 2} is incomplete (era, client_id, amounts)`)
    }
    const sheetRow = parseInt(col(r, 'sheet_row'), 10)
    return {
      era: col(r, 'era'), eraDate: col(r, 'era_date'), clientId: col(r, 'client_id'), clinician: col(r, 'clinician'),
      dos: col(r, 'dos'), cpt: col(r, 'cpt'), type,
      spBefore: before === '' ? undefined : parseFloat(before), enter, change, flags,
      sheetRow: Number.isNaN(sheetRow) ? undefined : sheetRow,
      checkEft: col(r, 'check_eft') || undefined, checkDate: col(r, 'check_date') || undefined,
      claimId: col(r, 'claim_id') || undefined,
      billed: Number.isNaN(parseFloat(col(r, 'billed'))) ? undefined : parseFloat(col(r, 'billed')),
      writeOff: Number.isNaN(parseFloat(col(r, 'write_off'))) ? undefined : parseFloat(col(r, 'write_off')),
    }
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Only lines with something to type count: a $0 COB line or a re-issue at the same amount needs nothing, and a denial only
// needs entry when it reverses a payment already in SimplePractice (e.g. an N4 re-denial: $150 -> $0).
const needsEntry = (l: SpEntryLine) => (l.type === 'new' || l.type === 'reprocessed' || l.type === 'offset' || l.type === 'denied') && l.change !== 0
const dateKey = (s: string) => { const [m, d, y] = s.split('/').map(Number); return (y || 0) * 10000 + (m || 0) * 100 + (d || 0) }

const TYPE_STYLE: Record<SpEntryType, string> = {
  new: 'bg-teal-pale text-teal',
  reprocessed: 'bg-warning-bg text-warning',
  offset: 'bg-gold-tint text-gold-dark',
  unchanged: 'bg-surface-sunken text-muted',
  denied: 'bg-error-bg text-error',
}

type View = 'todo' | 'all' | 'done' | SpEntryType
const VIEWS: Array<{ id: View; label: string }> = [
  { id: 'todo', label: 'To enter' }, { id: 'all', label: 'All' }, { id: 'done', label: 'Done' },
  { id: 'new', label: 'New' }, { id: 'reprocessed', label: 'Reprocessed' }, { id: 'offset', label: 'Recoup' },
  { id: 'unchanged', label: 'Unchanged' }, { id: 'denied', label: 'Denied' },
]

interface EraGroup { era: string; eraDate: string; checkEft?: string; checkDate?: string; lines: SpEntryLine[]; required: number; doneRequired: number }

function Progress({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 100 : Math.round((done / total) * 100)
  return (
    <div className="h-1.5 w-full rounded-full bg-surface-sunken overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-teal transition-[width] duration-300" style={{ width: `${pct}%` }} />
    </div>
  )
}

// Check/EFT # comes from Availity (it is not printed on the remittance PDF). Every ERA here has a $0.00
// payment total, so the amount to enter in SimplePractice's payment field is always 0.00.
function EftStrip({ checkEft, checkDate, saving, onCopy, onSave }: {
  checkEft?: string; checkDate?: string; saving: boolean
  onCopy: (text: string) => void; onSave: (eft: string, date: string) => void
}) {
  const [editing, setEditing] = useState(!checkEft)
  const [eft, setEft] = useState(checkEft ?? '')
  const [date, setDate] = useState(checkDate ?? '')
  const valid = /^\d{6,12}$/.test(eft.trim())
  const inputClass = 'h-8 rounded-lg border border-border bg-white px-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal'
  const copyBtn = 'rounded p-1 text-muted hover:text-teal hover:bg-teal-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal'

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 border-b border-border bg-surface-sunken/50 text-sm font-ui">
      {editing ? (
        <form className="flex flex-wrap items-center gap-2" onSubmit={e => { e.preventDefault(); if (valid) { onSave(eft.trim(), date.trim()); setEditing(false) } }}>
          <label className="text-muted" htmlFor="eft-input">Check/EFT #</label>
          <input id="eft-input" value={eft} onChange={e => setEft(e.target.value)} inputMode="numeric" placeholder="from Availity" className={`${inputClass} w-36`} />
          <input value={date} onChange={e => setDate(e.target.value)} aria-label="Check date" placeholder="Check date MM/DD/YYYY" className={`${inputClass} w-44`} />
          <Button size="sm" type="submit" disabled={!valid} loading={saving}>Save</Button>
          {checkEft && <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(false)}>Cancel</Button>}
        </form>
      ) : (
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-muted">Check/EFT #</span>
            <span className="font-mono font-semibold text-ink">{checkEft}</span>
            <button type="button" onClick={() => onCopy(checkEft ?? '')} aria-label="Copy Check/EFT number" className={copyBtn}><Copy size={12} /></button>
          </span>
          {checkDate && <span><span className="text-muted">Check date</span> <span className="text-ink tabular-nums">{checkDate}</span></span>}
          <Button size="sm" variant="secondary" type="button" icon={<Pencil size={12} />} onClick={() => setEditing(true)}>Change</Button>
        </>
      )}
      <span className="inline-flex items-center gap-1.5">
        <span className="text-muted">Payment amount</span>
        <span className="font-semibold text-ink tabular-nums">$0.00</span>
        <button type="button" onClick={() => onCopy('0.00')} aria-label="Copy 0.00" className={copyBtn}><Copy size={12} /></button>
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SpEntry() {
  const { data: lines, isLoading, isError, error } = useSpEntry()
  const importMut = useImportSpEntry()
  const setDone = useSetSpEntryDone()
  const setEft = useSetSpEntryEft()
  const toast = useToast()

  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<SpEntryImportRow[] | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [keepDone, setKeepDone] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<View>('todo')
  const [search, setSearch] = useState('')

  const groups: EraGroup[] = useMemo(() => {
    const map = new Map<string, EraGroup>()
    for (const l of lines ?? []) {
      const g = map.get(l.era) ?? { era: l.era, eraDate: l.eraDate, lines: [], required: 0, doneRequired: 0 }
      g.lines.push(l)
      if (l.checkEft && !g.checkEft) { g.checkEft = l.checkEft; g.checkDate = l.checkDate }
      if (needsEntry(l)) { g.required++; if (l.done) g.doneRequired++ }
      map.set(l.era, g)
    }
    return [...map.values()].sort((a, b) => dateKey(a.eraDate) - dateKey(b.eraDate) || a.era.localeCompare(b.era))
  }, [lines])

  const nextUp = groups.find(g => g.doneRequired < g.required)
  const activeEra = groups.find(g => g.era === selected) ?? nextUp ?? groups[0]
  const totals = useMemo(() => ({
    required: groups.reduce((s, g) => s + g.required, 0),
    done: groups.reduce((s, g) => s + g.doneRequired, 0),
    erasDone: groups.filter(g => g.doneRequired >= g.required).length,
  }), [groups])

  const shown = useMemo(() => {
    if (!activeEra) return []
    const q = search.trim().toLowerCase()
    // Display order only: client ID, then date of service, then CPT. Done flags are saved per line, so this never affects progress.
    const byClientThenDos = (x: SpEntryLine, y: SpEntryLine) =>
      x.clientId.localeCompare(y.clientId) || dateKey(x.dos) - dateKey(y.dos) || x.cpt.localeCompare(y.cpt)
    return [...activeEra.lines].sort(byClientThenDos).filter(l => {
      if (q && !(l.clientId.toLowerCase().includes(q) || l.dos.includes(q) || l.cpt.includes(q) || (l.claimId ?? '').includes(q))) return false
      if (view === 'todo') return needsEntry(l) && !l.done
      if (view === 'done') return l.done
      if (view === 'all') return true
      return l.type === view
    })
  }, [activeEra, view, search])

  // What the claim lines in this ERA add up to. HHO's own "payment adjustments" (forwarding-balance lines on
  // older claims) offset exactly this amount, which is why every ERA deposits $0.00.
  const eraStats = useMemo(() => {
    const ls = activeEra?.lines ?? []
    const newTotal = ls.filter(l => l.type === 'new').reduce((s, l) => s + l.enter, 0)
    const corrections = ls.filter(l => l.type !== 'new').reduce((s, l) => s + l.change, 0)
    return { newTotal, corrections, claimsNet: Math.round((newTotal + corrections) * 100) / 100 }
  }, [activeEra])

  async function onFile(file: File | undefined) {
    setImportError(null); setPending(null)
    if (!file) return
    try { setPending(csvToImportRows(await file.text())) }
    catch (e) { setImportError((e as Error).message) }
  }

  async function runImport() {
    if (!pending) return
    await importMut.mutateAsync({ rows: pending, replace: (lines?.length ?? 0) > 0, keepDone })
    setPending(null); setShowImport(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function copyText(text: string) {
    try { await navigator.clipboard.writeText(text); toast.success(`Copied ${text}`) }
    catch { toast.error('Copy failed') }
  }
  const copyAmount = (n: number) => copyText(n.toFixed(2))

  const toggle = (l: SpEntryLine) => setDone.mutate({ rowIndexes: [l.rowIndex], done: !l.done })
  const bulk = (done: boolean) => {
    const idx = shown.filter(l => l.done !== done).map(l => l.rowIndex)
    if (idx.length) setDone.mutate({ rowIndexes: idx, done })
  }

  const importCard = (
    <Card
      title={lines && lines.length > 0 ? 'Re-import ERA data' : 'Import ERA data'}
      subtitle="Choose the parsed-ERA CSV (SP_ENTRY_BY_ERA_*.csv). Hashed Client IDs only."
    >
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef} type="file" accept=".csv,text/csv"
          onChange={e => onFile(e.target.files?.[0])}
          className="text-sm font-body text-ink file:mr-3 file:h-9 file:rounded-lg file:border file:border-border file:bg-white file:px-3 file:text-sm file:font-ui file:text-teal hover:file:bg-surface-sunken"
        />
        <Button size="sm" icon={<Upload size={14} />} disabled={!pending || importMut.isPending} loading={importMut.isPending} onClick={runImport}>
          {pending ? `Import ${pending.length} lines` : 'Import'}
        </Button>
      </div>
      {(lines?.length ?? 0) > 0 && (
        <label className="mt-3 flex items-center gap-2 text-sm font-body text-ink">
          <input type="checkbox" checked={keepDone} onChange={e => setKeepDone(e.target.checked)} className="h-4 w-4 rounded border-border-strong accent-teal" />
          Keep lines already marked done (uncheck to start fresh)
        </label>
      )}
      {importError && <p className="mt-3 text-sm text-error font-body">{importError}</p>}
      {pending && (
        <p className="mt-3 text-xs text-muted font-body">
          {new Set(pending.map(p => p.era)).size} ERAs · {pending.filter(p => p.type === 'new').length} new ·{' '}
          {pending.filter(p => p.type === 'reprocessed').length} reprocessed · {pending.filter(p => p.type === 'unchanged').length} unchanged ·{' '}
          {pending.filter(p => p.type === 'denied').length} denied
          {(lines?.length ?? 0) > 0 && (keepDone ? ' — replaces the current data; lines already marked done stay done.' : ' — replaces the current data and clears all done ticks.')}
        </p>
      )}
    </Card>
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="SP Entry"
        subtitle="Checklist for posting HHO ERAs in SimplePractice. Enter ERAs in date order. SimplePractice adds the amount you type to what is already posted, so reductions are negative and each ERA's lines should net to $0.00. Write off a line the first time HHO pays the contract rate on it; wait means not yet."
        actions={lines && lines.length > 0 ? (
          <Button size="sm" variant="secondary" onClick={() => setShowImport(s => !s)}>Re-import data</Button>
        ) : undefined}
      />

      {isLoading && <LoadingSpinner label="Loading SP entry list…" />}
      {isError && <ErrorBanner message={(error as Error).message} />}

      {lines && lines.length === 0 && (
        <>
          <EmptyState
            icon={<ClipboardCheck size={32} />}
            title="No ERA lines imported yet"
            description="Import the parsed-ERA CSV to build the checklist. Progress is saved to the Sheet as you tick lines off."
          />
          {importCard}
        </>
      )}

      {lines && lines.length > 0 && activeEra && (
        <>
          {showImport && importCard}

          <Card padding="sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-sm font-ui">
              <span className="text-ink font-medium tabular-nums">{totals.done} of {totals.required} lines entered</span>
              <span className="text-muted">{totals.erasDone} of {groups.length} ERAs complete{nextUp ? ` · next: ${nextUp.era} (${nextUp.eraDate})` : ' · all done'}</span>
            </div>
            <Progress done={totals.done} total={totals.required} />
          </Card>

          <div className="grid gap-4 md:grid-cols-[250px_1fr] items-start">
            <nav aria-label="ERAs" className="rounded-xl border border-border bg-surface shadow-card overflow-hidden">
              <ul className="divide-y divide-border max-h-[70vh] overflow-y-auto">
                {groups.map((g, i) => {
                  const complete = g.doneRequired >= g.required
                  const active = g.era === activeEra.era
                  return (
                    <li key={g.era}>
                      <button
                        type="button"
                        onClick={() => { setSelected(g.era); setView('todo'); setSearch('') }}
                        aria-current={active ? 'true' : undefined}
                        className={`w-full text-left px-3.5 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal hover:bg-surface-sunken ${active ? 'bg-teal-pale' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2 text-sm font-ui">
                          <span className="font-medium text-ink">{i + 1}. {g.era.split('/')[1] ?? g.era}</span>
                          <span className={`text-xs tabular-nums ${complete ? 'text-success font-medium' : 'text-muted'}`}>
                            {complete ? 'Done' : `${g.doneRequired}/${g.required}`}
                          </span>
                        </div>
                        <div className="text-xs text-muted font-body mb-1.5">
                          {g.eraDate}{!g.checkEft && <span className="ml-1.5 text-warning font-medium">· EFT # needed</span>}
                        </div>
                        <Progress done={g.doneRequired} total={g.required} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>

            <Card
              padding="none"
              className="min-w-0"
              title={`ERA ${activeEra.era} · ${activeEra.eraDate}`}
              subtitle={`New ${formatCurrency(eraStats.newTotal)} · reductions ${formatCurrency(eraStats.corrections)} · net ${formatCurrency(eraStats.claimsNet)} (SimplePractice Unallocated should be $0.00) · ${activeEra.doneRequired}/${activeEra.required} entered`}
              actions={
                <>
                  <Button size="sm" variant="secondary" icon={<CheckCheck size={14} />} disabled={!shown.some(l => !l.done)} onClick={() => bulk(true)}>Mark shown done</Button>
                  <Button size="sm" variant="ghost" icon={<Undo2 size={14} />} disabled={!shown.some(l => l.done)} onClick={() => bulk(false)}>Undo shown</Button>
                </>
              }
            >
              <EftStrip
                key={`${activeEra.era}|${activeEra.checkEft ?? ''}`}
                checkEft={activeEra.checkEft} checkDate={activeEra.checkDate}
                saving={setEft.isPending} onCopy={copyText}
                onSave={(eft, date) => setEft.mutate({ era: activeEra.era, checkEft: eft, checkDate: date })}
              />

              <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter lines">
                  {VIEWS.map(v => (
                    <button
                      key={v.id} type="button" onClick={() => setView(v.id)} aria-pressed={view === v.id}
                      className={`h-7 px-2.5 rounded-full text-xs font-ui border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${view === v.id ? 'bg-teal text-white border-teal' : 'bg-white text-muted border-border hover:bg-surface-sunken'}`}
                    >{v.label}</button>
                  ))}
                </div>
                <div className="relative ml-auto">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input
                    type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Client ID, claim #, date, code"
                    aria-label="Search lines"
                    className="h-8 w-52 rounded-lg border border-border bg-white pl-8 pr-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal"
                  />
                </div>
              </div>

              {shown.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted font-body">
                  {view === 'todo' && activeEra.doneRequired >= activeEra.required ? 'Every line in this ERA is entered.' : 'No lines match this filter.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-body">
                    <thead>
                      <tr className="border-b border-border text-xs font-ui text-muted uppercase tracking-wide">
                        <th className="w-10 py-2.5 pl-4 text-left"><span className="sr-only">Done</span></th>
                        <th className="text-left py-2.5 px-3">Client ID</th>
                        <th className="text-left py-2.5 px-3">Clinician</th>
                        <th className="text-left py-2.5 px-3">DOS</th>
                        <th className="text-left py-2.5 px-3">CPT</th>
                        <th className="text-left py-2.5 px-3">HHO claim #</th>
                        <th className="text-left py-2.5 px-3">Type</th>
                        <th className="text-right py-2.5 px-3">In SP now</th>
                        <th className="text-right py-2.5 px-3">Billed</th>
                        <th className="text-right py-2.5 px-3">Enter (adds to SP)</th>
                        <th className="text-right py-2.5 px-3">Write-off</th>
                        <th className="text-right py-2.5 px-3">Result</th>
                        <th className="text-left py-2.5 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {shown.map(l => (
                        <tr key={l.rowIndex} className={l.done ? 'bg-surface-sunken/60 text-muted' : 'hover:bg-surface-sunken/50'}>
                          <td className="py-2 pl-4">
                            <input
                              type="checkbox" checked={l.done} onChange={() => toggle(l)}
                              aria-label={`Mark ${l.clientId} ${l.dos} ${l.cpt} as entered`}
                              className="h-4 w-4 rounded border-border-strong accent-teal cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono text-xs whitespace-nowrap">{l.clientId}</td>
                          <td className="py-2 px-3 whitespace-nowrap">{l.clinician || '—'}</td>
                          <td className="py-2 px-3 whitespace-nowrap tabular-nums">{l.dos}</td>
                          <td className="py-2 px-3 tabular-nums">{l.cpt}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {l.claimId ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="font-mono text-xs">{l.claimId}</span>
                                <button
                                  type="button" onClick={() => copyText(l.claimId ?? '')} aria-label={`Copy claim number ${l.claimId}`}
                                  className="rounded p-1 text-muted hover:text-teal hover:bg-teal-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                                ><Copy size={12} /></button>
                              </span>
                            ) : '—'}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-ui font-medium ${TYPE_STYLE[l.type]}`}>{l.type === 'offset' ? 'recoup' : l.type === 'unchanged' ? 'no change' : l.type}</span>
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">{l.spBefore != null ? formatCurrency(l.spBefore) : '—'}</td>
                          <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap text-muted">{l.billed != null ? formatCurrency(l.billed) : '—'}</td>
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            {l.change === 0 ? <span className="text-xs text-muted">{l.type === 'denied' ? 'no payment' : 'nothing to add'}</span> : (
                              <span className="inline-flex items-center gap-1.5">
                                <span className={`tabular-nums ${l.done ? '' : `font-semibold ${l.change < 0 ? 'text-error' : 'text-ink'}`}`}>{formatCurrency(l.change)}</span>
                                <button
                                  type="button" onClick={() => copyAmount(l.change)} aria-label={`Copy ${l.change.toFixed(2)}`}
                                  className="rounded p-1 text-muted hover:text-teal hover:bg-teal-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                                ><Copy size={12} /></button>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            {l.writeOff == null || l.writeOff === 0 ? <span className="text-xs text-muted" title={l.flags}>{l.writeOff === 0 ? 'none' : l.type === 'denied' || l.change === 0 && l.enter === 0 ? '—' : 'wait'}</span> : (
                              <span className="inline-flex items-center gap-1.5">
                                <span className={`tabular-nums ${l.done ? '' : `font-semibold ${l.writeOff < 0 ? 'text-error' : 'text-ink'}`}`}>{formatCurrency(l.writeOff)}</span>
                                <button
                                  type="button" onClick={() => copyAmount(l.writeOff ?? 0)} aria-label={`Copy write-off ${(l.writeOff ?? 0).toFixed(2)}`}
                                  className="rounded p-1 text-muted hover:text-teal hover:bg-teal-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                                ><Copy size={12} /></button>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap text-muted">{l.type === 'offset' && l.flags.includes('claim has') ? '—' : formatCurrency(l.enter)}</td>
                          <td className="py-2 px-3 text-xs max-w-[16rem] truncate" title={l.flags}>{l.flags || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
