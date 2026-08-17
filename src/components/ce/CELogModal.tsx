import { useForm } from 'react-hook-form'
import type { CELogRecord, Clinician } from '../../types'
import { useCreateCELog, useUpdateCELog } from '../../hooks/useCE'
import Dialog from '../ui/Dialog'
import Button from '../ui/Button'

interface Props {
  clinician: Clinician
  categoryOptions: string[]
  record?: CELogRecord // omitted = create mode
  onClose: () => void
}

interface FormValues {
  activityTitle: string
  provider: string
  dateCompleted: string
  hours: string
  category: string
  certificateLink: string
}

export default function CELogModal({ clinician, categoryOptions, record, onClose }: Props) {
  const create = useCreateCELog()
  const update = useUpdateCELog()
  const isEdit = Boolean(record)

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      activityTitle: record?.activityTitle ?? '',
      provider: record?.provider ?? '',
      dateCompleted: record?.dateCompleted ?? '',
      hours: record ? String(record.hours) : '',
      category: record?.category ?? categoryOptions[0] ?? 'General',
      certificateLink: record?.certificateLink ?? '',
    },
  })

  const onSubmit = (values: FormValues) => {
    const data = {
      clinician,
      activityTitle: values.activityTitle,
      provider: values.provider || undefined,
      dateCompleted: values.dateCompleted,
      hours: Number(values.hours) || 0,
      category: values.category || undefined,
      certificateLink: values.certificateLink || undefined,
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
    <Dialog open onClose={onClose} title={isEdit ? `Edit Activity — ${clinician}` : `Log CE Activity — ${clinician}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className={labelClass}>Activity Title</label>
          <input
            {...register('activityTitle', { required: true })}
            className={inputClass}
            placeholder="e.g. Ethics in Telehealth Practice"
          />
        </div>

        <div>
          <label className={labelClass}>Provider</label>
          <input {...register('provider')} className={inputClass} placeholder="e.g. PESI, NASW, AllCEUs" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date Completed</label>
            <input type="date" {...register('dateCompleted', { required: true })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Hours</label>
            <input type="number" step="0.5" min="0" {...register('hours', { required: true })} className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Category</label>
          <select {...register('category')} className={inputClass}>
            {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Certificate Link</label>
          <input {...register('certificateLink')} className={inputClass} placeholder="Drive URL" />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" loading={isPending}>Save</Button>
        </div>
      </form>
    </Dialog>
  )
}
