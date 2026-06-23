import { Loader2 } from 'lucide-react'
import { useInlineEdit } from './useInlineEdit'
import { formatDate } from '../../../lib/utils'

interface Props {
  value: string
  rawValue: string
  onSave?: (value: string) => Promise<void>
}

export default function DateCell({ value, rawValue, onSave }: Props) {
  const edit = useInlineEdit(rawValue, onSave)

  if (edit.saving) {
    return (
      <span className="flex items-center gap-1 text-muted">
        <Loader2 size={12} className="animate-spin" />
        <span className="opacity-50">{value ? formatDate(value) : '—'}</span>
      </span>
    )
  }

  if (edit.error) return <span className="text-error text-xs">{edit.error}</span>

  if (edit.editing) {
    return (
      <input
        ref={edit.inputRef as React.RefObject<HTMLInputElement>}
        type="date"
        value={edit.value}
        onChange={e => edit.setValue(e.target.value)}
        onBlur={e => edit.commit(e.target.value)}
        onKeyDown={edit.onKeyDown}
        className="w-full text-sm font-body border border-teal rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-teal"
      />
    )
  }

  const display = value ? formatDate(value) : ''

  return (
    <span
      className={`whitespace-nowrap ${onSave ? 'cursor-pointer hover:bg-teal-pale rounded px-1 -mx-1 transition-colors inline-block min-w-8' : ''}`}
      onClick={onSave ? edit.start : undefined}
      title={onSave ? 'Click to edit' : undefined}
    >
      {display || <span className="text-muted italic">—</span>}
    </span>
  )
}
