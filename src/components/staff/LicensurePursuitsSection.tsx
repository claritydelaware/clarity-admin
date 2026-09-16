import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Check, X, Loader2, ChevronDown, ChevronRight, ExternalLink, Sparkles, ArrowUp, ArrowDown } from 'lucide-react'
import {
  useLicensurePursuits, useCreatePursuit, useUpdatePursuit, useDeletePursuit,
  usePursuitSteps, useCreateStep, useUpdateStep, useDeleteStep,
} from '../../hooks/useStaff'
import { useToast } from '../../context/ToastContext'
import { api } from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { PursuitStatusBadge, StepStatusBadge } from '../ui/Badge'
import { PURSUIT_STATUSES, STEP_STATUSES } from '../../types'
import type { LicensurePursuit, PursuitStep, PursuitStatus, StepStatus } from '../../types'

const FIELD_CLS = 'rounded-lg border border-border px-2 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-teal'

const STARTER_STEPS: Array<{ label: string; notes: string }> = [
  { label: 'Order transcripts', notes: '' },
  { label: 'Request ASWB exam scores sent', notes: '' },
  { label: 'License verification / databank self-query', notes: '' },
  { label: 'Submit application', notes: '' },
]

// ─── Pursuit form ──────────────────────────────────────────────────────────

interface PursuitFormState {
  state: string
  credential: string
  status: PursuitStatus
  targetDate: string
  notes: string
}

const emptyPursuitForm = (): PursuitFormState => ({
  state: '', credential: 'LCSW', status: 'Not Started', targetDate: '', notes: '',
})

function pursuitFormFields(form: PursuitFormState, setForm: (f: PursuitFormState) => void) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <input
        placeholder="State (e.g. PA)"
        maxLength={2}
        value={form.state}
        onChange={e => setForm({ ...form, state: e.target.value.toUpperCase() })}
        className={FIELD_CLS}
      />
      <input
        placeholder="Credential (e.g. LCSW)"
        value={form.credential}
        onChange={e => setForm({ ...form, credential: e.target.value })}
        className={FIELD_CLS}
      />
      <select
        value={form.status}
        onChange={e => setForm({ ...form, status: e.target.value as PursuitStatus })}
        className={FIELD_CLS}
      >
        {PURSUIT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <input
        type="date"
        title="Target date"
        value={form.targetDate}
        onChange={e => setForm({ ...form, targetDate: e.target.value })}
        className={FIELD_CLS}
      />
      <input
        placeholder="Notes"
        value={form.notes}
        onChange={e => setForm({ ...form, notes: e.target.value })}
        className={FIELD_CLS}
      />
    </div>
  )
}

// ─── Step form ─────────────────────────────────────────────────────────────

interface StepFormState {
  label: string
  status: StepStatus
  dueDate: string
  link: string
  notes: string
}

const emptyStepForm = (): StepFormState => ({
  label: '', status: 'Not Started', dueDate: '', link: '', notes: '',
})

function stepFormFields(form: StepFormState, setForm: (f: StepFormState) => void) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <input
        placeholder="Step (e.g. Order transcripts)"
        value={form.label}
        onChange={e => setForm({ ...form, label: e.target.value })}
        className={`${FIELD_CLS} sm:col-span-2`}
      />
      <select
        value={form.status}
        onChange={e => setForm({ ...form, status: e.target.value as StepStatus })}
        className={FIELD_CLS}
      >
        {STEP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <input
        type="date"
        title="Due date"
        value={form.dueDate}
        onChange={e => setForm({ ...form, dueDate: e.target.value })}
        className={FIELD_CLS}
      />
      <input
        placeholder="Link (portal URL)"
        value={form.link}
        onChange={e => setForm({ ...form, link: e.target.value })}
        className={FIELD_CLS}
      />
      <input
        placeholder="Notes"
        value={form.notes}
        onChange={e => setForm({ ...form, notes: e.target.value })}
        className={`${FIELD_CLS} sm:col-span-4`}
      />
    </div>
  )
}

function StepRow({ step, isFirst, isLast, onMoveUp, onMoveDown, onEdit, onDelete }: {
  step: PursuitStep; isFirst: boolean; isLast: boolean
  onMoveUp: () => void; onMoveDown: () => void; onEdit: () => void; onDelete: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  return (
    <tr className="border-t border-border">
      <td className="py-2 pr-2 whitespace-nowrap">
        <span className="inline-flex flex-col -my-1">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-0.5 text-muted hover:text-teal disabled:opacity-30 disabled:pointer-events-none"
            title="Move up"
          >
            <ArrowUp size={12} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-0.5 text-muted hover:text-teal disabled:opacity-30 disabled:pointer-events-none"
            title="Move down"
          >
            <ArrowDown size={12} />
          </button>
        </span>
      </td>
      <td className="py-2 pr-3 text-sm font-body text-ink">{step.label}</td>
      <td className="py-2 pr-3"><StepStatusBadge status={step.status} /></td>
      <td className="py-2 pr-3 text-xs font-body text-muted">{step.dueDate ?? '—'}</td>
      <td className="py-2 pr-3">
        {step.link ? (
          <a href={step.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-teal hover:underline">
            Open <ExternalLink size={11} />
          </a>
        ) : <span className="text-xs text-muted">—</span>}
      </td>
      <td className="py-2 pr-3 text-xs font-body text-muted">{step.notes || '—'}</td>
      <td className="py-2 text-right whitespace-nowrap">
        {confirming ? (
          <span className="inline-flex items-center gap-1">
            <span className="text-xs text-error font-ui mr-1">Remove?</span>
            <button onClick={() => { onDelete(); setConfirming(false) }} className="p-1 text-error hover:bg-red-50 rounded">
              <Check size={12} />
            </button>
            <button onClick={() => setConfirming(false)} className="p-1 text-muted hover:bg-surface-sunken rounded">
              <X size={12} />
            </button>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <button onClick={onEdit} className="p-1 text-muted hover:text-teal hover:bg-teal-pale rounded transition-colors">
              <Pencil size={13} />
            </button>
            <button onClick={() => setConfirming(true)} className="p-1 text-muted hover:text-error hover:bg-red-50 rounded transition-colors">
              <Trash2 size={13} />
            </button>
          </span>
        )}
      </td>
    </tr>
  )
}

function StepsChecklist({ pursuitId }: { pursuitId: string }) {
  const { data: steps, isLoading } = usePursuitSteps(pursuitId)
  const { mutate: createStep, isPending: isCreating } = useCreateStep(pursuitId)
  const { mutate: updateStep, isPending: isUpdating } = useUpdateStep(pursuitId)
  const { mutate: deleteStep } = useDeleteStep(pursuitId)
  const qc = useQueryClient()
  const toast = useToast()

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<StepFormState>(emptyStepForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<StepFormState>(emptyStepForm())
  const [seeding, setSeeding] = useState(false)

  const startEdit = (s: PursuitStep) => {
    setEditingId(s.id)
    setEditForm({ label: s.label, status: s.status, dueDate: s.dueDate ?? '', link: s.link ?? '', notes: s.notes })
  }

  const handleAdd = () => {
    createStep({
      label: addForm.label, status: addForm.status,
      dueDate: addForm.dueDate || null, link: addForm.link || null, notes: addForm.notes,
    }, { onSuccess: () => { setShowAdd(false); setAddForm(emptyStepForm()) } })
  }

  const handleUpdate = (stepId: string) => {
    updateStep({
      stepId,
      data: {
        label: editForm.label, status: editForm.status,
        dueDate: editForm.dueDate || null, link: editForm.link || null, notes: editForm.notes,
      },
    }, { onSuccess: () => setEditingId(null) })
  }

  const moveStep = async (index: number, direction: -1 | 1) => {
    if (!steps) return
    const otherIndex = index + direction
    if (otherIndex < 0 || otherIndex >= steps.length) return
    // Re-number the whole list on every move (not just the two swapped steps) so
    // legacy rows sharing sortOrder 0 (from before this field existed) get fixed too.
    // Sent as a single batch request — one Sheets API round trip instead of one per step.
    const reordered = [...steps]
    ;[reordered[index], reordered[otherIndex]] = [reordered[otherIndex], reordered[index]]
    // Optimistic local update so the row order flips instantly instead of waiting on the round trip.
    qc.setQueryData(['pursuit-steps', pursuitId], reordered)
    try {
      await api.pursuitSteps.reorder(pursuitId, reordered.map(s => s.id))
      await qc.invalidateQueries({ queryKey: ['pursuit-steps', pursuitId] })
    } catch {
      toast.error('Failed to reorder steps')
      await qc.invalidateQueries({ queryKey: ['pursuit-steps', pursuitId] })
    }
  }

  const seedStarterChecklist = async () => {
    setSeeding(true)
    try {
      for (const s of STARTER_STEPS) {
        await api.pursuitSteps.create(pursuitId, { label: s.label, status: 'Not Started', dueDate: null, link: null, notes: s.notes })
      }
      await qc.invalidateQueries({ queryKey: ['pursuit-steps', pursuitId] })
      toast.success('Starter checklist added')
    } catch {
      toast.error('Failed to add starter checklist')
    } finally {
      setSeeding(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted text-sm font-body py-2">
        <Loader2 size={14} className="animate-spin" /> Loading steps…
      </div>
    )
  }

  return (
    <div className="pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-ui font-medium text-muted uppercase tracking-wide">Checklist</p>
        <div className="flex items-center gap-2">
          {steps && steps.length === 0 && !showAdd && (
            <Button variant="ghost" size="sm" icon={<Sparkles size={13} />} loading={seeding} onClick={seedStarterChecklist}>
              Load starter checklist
            </Button>
          )}
          {!showAdd && (
            <Button variant="ghost" size="sm" icon={<Plus size={13} />} onClick={() => setShowAdd(true)}>
              Add Step
            </Button>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="space-y-2 p-3 bg-teal-pale/40 rounded-lg border border-teal/20 mb-3">
          {stepFormFields(addForm, setAddForm)}
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" loading={isCreating} disabled={!addForm.label} onClick={handleAdd}>Save</Button>
            <Button variant="secondary" size="sm" onClick={() => { setShowAdd(false); setAddForm(emptyStepForm()) }}>Cancel</Button>
          </div>
        </div>
      )}

      {steps && steps.length === 0 && !showAdd && (
        <p className="text-sm font-body text-muted italic">No steps yet. Load the starter checklist or add one manually.</p>
      )}

      {steps && steps.length > 0 && (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full min-w-150 px-2">
            <thead>
              <tr>
                {['', 'Step', 'Status', 'Due', 'Link', 'Notes', ''].map((h, i) => (
                  <th key={i} className="text-left text-xs font-ui font-medium text-muted uppercase tracking-wide pb-2 pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {steps.map((s, i) => editingId === s.id ? (
                <tr key={s.id} className="border-t border-border">
                  <td colSpan={6} className="py-2 pr-3">
                    {stepFormFields(editForm, setEditForm)}
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleUpdate(s.id)}
                        disabled={isUpdating}
                        className="p-1 text-teal hover:bg-teal-pale rounded transition-colors disabled:opacity-60"
                      >
                        {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-muted hover:bg-surface-sunken rounded">
                        <X size={12} />
                      </button>
                    </span>
                  </td>
                </tr>
              ) : (
                <StepRow
                  key={s.id}
                  step={s}
                  isFirst={i === 0}
                  isLast={i === steps.length - 1}
                  onMoveUp={() => moveStep(i, -1)}
                  onMoveDown={() => moveStep(i, 1)}
                  onEdit={() => startEdit(s)}
                  onDelete={() => deleteStep(s.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Pursuit card ──────────────────────────────────────────────────────────

function PursuitCard({ pursuit, onEdit, onDelete }: {
  pursuit: LicensurePursuit; onEdit: () => void; onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-start gap-2 text-left flex-1 min-w-0"
        >
          {expanded ? <ChevronDown size={16} className="mt-0.5 text-muted shrink-0" /> : <ChevronRight size={16} className="mt-0.5 text-muted shrink-0" />}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-heading text-sm font-semibold text-ink">{pursuit.credential} — {pursuit.state}</span>
              <PursuitStatusBadge status={pursuit.status} />
            </div>
            <p className="text-xs font-body text-muted mt-0.5">
              {pursuit.targetDate ? `Target: ${pursuit.targetDate}` : 'No target date'}
              {pursuit.notes ? ` · ${pursuit.notes}` : ''}
            </p>
          </div>
        </button>
        {confirming ? (
          <span className="inline-flex items-center gap-1 shrink-0">
            <span className="text-xs text-error font-ui mr-1">Remove?</span>
            <button onClick={() => { onDelete(); setConfirming(false) }} className="p-1 text-error hover:bg-red-50 rounded">
              <Check size={12} />
            </button>
            <button onClick={() => setConfirming(false)} className="p-1 text-muted hover:bg-surface-sunken rounded">
              <X size={12} />
            </button>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 shrink-0">
            <button onClick={onEdit} className="p-1 text-muted hover:text-teal hover:bg-teal-pale rounded transition-colors">
              <Pencil size={13} />
            </button>
            <button onClick={() => setConfirming(true)} className="p-1 text-muted hover:text-error hover:bg-red-50 rounded transition-colors">
              <Trash2 size={13} />
            </button>
          </span>
        )}
      </div>

      {expanded && <StepsChecklist pursuitId={pursuit.id} />}
    </div>
  )
}

// ─── Main section ──────────────────────────────────────────────────────────

export default function LicensurePursuitsSection({ staffId }: { staffId: string }) {
  const { data: pursuits, isLoading } = useLicensurePursuits(staffId)
  const { mutate: createPursuit, isPending: isCreating } = useCreatePursuit(staffId)
  const { mutate: updatePursuit, isPending: isUpdating } = useUpdatePursuit(staffId)
  const { mutate: deletePursuit } = useDeletePursuit(staffId)

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<PursuitFormState>(emptyPursuitForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<PursuitFormState>(emptyPursuitForm())

  const startEdit = (p: LicensurePursuit) => {
    setEditingId(p.id)
    setEditForm({ state: p.state, credential: p.credential, status: p.status, targetDate: p.targetDate ?? '', notes: p.notes })
  }

  const handleAdd = () => {
    createPursuit({
      state: addForm.state, credential: addForm.credential, status: addForm.status,
      targetDate: addForm.targetDate || null, notes: addForm.notes,
    }, { onSuccess: () => { setShowAdd(false); setAddForm(emptyPursuitForm()) } })
  }

  const handleUpdate = (pursuitId: string) => {
    updatePursuit({
      pursuitId,
      data: {
        state: editForm.state, credential: editForm.credential, status: editForm.status,
        targetDate: editForm.targetDate || null, notes: editForm.notes,
      },
    }, { onSuccess: () => setEditingId(null) })
  }

  return (
    <Card
      title="Licensure Pursuits"
      actions={!showAdd ? (
        <Button variant="ghost" size="sm" icon={<Plus size={13} />} onClick={() => setShowAdd(true)}>
          Add Pursuit
        </Button>
      ) : undefined}
    >
      {isLoading && (
        <div className="flex items-center gap-2 text-muted text-sm font-body">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      )}

      {showAdd && (
        <div className="space-y-2 p-3 bg-teal-pale/40 rounded-lg border border-teal/20 mb-4">
          <p className="text-xs font-ui text-muted uppercase tracking-wide">New Pursuit</p>
          {pursuitFormFields(addForm, setAddForm)}
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" loading={isCreating} disabled={!addForm.state || !addForm.credential} onClick={handleAdd}>
              Save
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { setShowAdd(false); setAddForm(emptyPursuitForm()) }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {pursuits && pursuits.length === 0 && !showAdd && (
        <p className="text-sm font-body text-muted italic">No licensure pursuits tracked yet. Click "+ Add Pursuit" to start one.</p>
      )}

      <div className="space-y-3">
        {pursuits?.map(p => editingId === p.id ? (
          <div key={p.id} className="space-y-2 p-3 bg-teal-pale/40 rounded-lg border border-teal/20">
            {pursuitFormFields(editForm, setEditForm)}
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" loading={isUpdating} onClick={() => handleUpdate(p.id)}>Save</Button>
              <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <PursuitCard key={p.id} pursuit={p} onEdit={() => startEdit(p)} onDelete={() => deletePursuit(p.id)} />
        ))}
      </div>
    </Card>
  )
}
