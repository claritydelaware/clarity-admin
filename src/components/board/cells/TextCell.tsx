import { Loader2 } from 'lucide-react'
import { useInlineEdit } from './useInlineEdit'

interface Props {
  value: string
  onSave?: (value: string) => Promise<void>
  inputType?: 'text' | 'select'
  options?: readonly string[]
  truncate?: boolean
  className?: string
}

export default function TextCell({ value, onSave, inputType = 'text', options, truncate, className = '' }: Props) {
  const edit = useInlineEdit(value, onSave)

  if (edit.saving) {
    return (
      <span className="flex items-center gap-1 text-muted">
        <Loader2 size={12} className="animate-spin shrink-0" />
        <span className="opacity-50">{value}</span>
      </span>
    )
  }

  if (edit.error) return <span className="text-error text-xs">{edit.error}</span>

  if (edit.editing) {
    if (inputType === 'select' && options) {
      return (
        <select
          ref={edit.inputRef as React.RefObject<HTMLSelectElement>}
          value={edit.value}
          onChange={e => edit.setValue(e.target.value)}
          onBlur={e => edit.commit(e.target.value)}
          onKeyDown={edit.onKeyDown}
          className="text-sm font-body border border-teal rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-teal w-full"
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    }

    return (
      <input
        ref={edit.inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={edit.value}
        onChange={e => edit.setValue(e.target.value)}
        onBlur={e => edit.commit(e.target.value)}
        onKeyDown={edit.onKeyDown}
        className="text-sm font-body border border-teal rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-teal w-full"
      />
    )
  }

  return (
    <span
      className={[
        onSave ? 'cursor-pointer hover:bg-teal-pale rounded px-1 -mx-1 transition-colors inline-block min-w-8' : '',
        truncate ? 'block max-w-40 truncate' : '',
        className,
      ].join(' ')}
      onClick={onSave ? edit.start : undefined}
      title={onSave ? 'Click to edit' : undefined}
    >
      {value || <span className="text-muted italic">—</span>}
    </span>
  )
}
