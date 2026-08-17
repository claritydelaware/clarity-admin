import { useForm } from 'react-hook-form'
import type { CredentialingRecord, CredentialingStatus, Clinician } from '../../types'
import { CREDENTIALING_STATUSES, KNOWN_PAYERS } from '../../types'
import { useCreateCredentialing, useUpdateCredentialing } from '../../hooks/useCredentialing'
import Dialog from '../ui/Dialog'
import Button from '../ui/Button'

interface Props {
  clinician: Clinician
  record?: CredentialingRecord // omitted = create mode
  onClose: () => void
}

interface FormValues {
  payer: string
  status: CredentialingStatus
  dateSubmitted: string
  dateEffective: string
  providerIdentifier: string
  caqhLinked: boolean
  contractLink: string
  notes: string
}

export default function CredentialingModal({ clinician, record, onClose }: Props) {
  const create = useCreateCredentialing()
  const update = useUpdateCredentialing()
  const isEdit = Boolean(record)

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      payer: record?.payer ?? '',
      status: record?.status ?? 'Not Started',
      dateSubmitted: record?.dateSubmitted ?? '',
      dateEffective: record?.dateEffective ?? '',
      providerIdentifier: record?.providerIdentifier ?? '',
      caqhLinked: record?.caqhLinked ?? false,
      contractLink: record?.contractLink ?? '',
      notes: record?.notes ?? '',
    },
  })

  const onSubmit = (values: FormValues) => {
    const data = {
      clinician,
      payer: values.payer,
      status: values.status,
      dateSubmitted: values.dateSubmitted || undefined,
      dateEffective: values.dateEffective || undefined,
      providerIdentifier: values.providerIdentifier || undefined,
      caqhLinked: values.caqhLinked,
      contractLink: values.contractLink || undefined,
      notes: values.notes || undefined,
    }
    if (isEdit && record) {
      update.mutate({ rowIndex: record.rowIndex, data }, { onSuccess: onClose })
    } else {
      create.mutate(data, { onSuccess: onClose })
    }
  }

  const isPending = create.isPending || update.isPending
  const inputClass = 'w-full h-9 rounded-lg border border-border bg-white px-3 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal'
  const labelClass = 'block text-xs font-medium text-muted font-ui mb-1.5'

  return (
    <Dialog open onClose={onClose} title={isEdit ? `Update ${clinician} · ${record?.payer}` : `Add Payer — ${clinician}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!isEdit && (
          <div>
            <label className={labelClass}>Payer</label>
            <input
              {...register('payer', { required: true })}
              className={inputClass}
              placeholder="e.g. Aetna"
              list="known-payers"
            />
            <datalist id="known-payers">
              {KNOWN_PAYERS.map(p => <option key={p} value={p} />)}
            </datalist>
          </div>
        )}

        <div>
          <label className={labelClass}>Status</label>
          <select {...register('status')} className={inputClass}>
            {CREDENTIALING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date Submitted</label>
            <input type="date" {...register('dateSubmitted')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Date Effective</label>
            <input type="date" {...register('dateEffective')} className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Provider Identifier</label>
          <input {...register('providerIdentifier')} className={inputClass} placeholder="PIN / Blue Shield ID / PTAN" />
        </div>

        <div>
          <label className={labelClass}>Contract / Confirmation Link</label>
          <input {...register('contractLink')} className={inputClass} placeholder="Drive URL" />
        </div>

        <label className="flex items-center gap-2 text-sm font-body text-ink">
          <input type="checkbox" {...register('caqhLinked')} className="rounded border-border text-teal focus:ring-teal" />
          CAQH linked
        </label>

        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            {...register('notes')}
            rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm font-body text-ink resize-none focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal"
            placeholder="Optional notes…"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" loading={isPending}>Save</Button>
        </div>
      </form>
    </Dialog>
  )
}
