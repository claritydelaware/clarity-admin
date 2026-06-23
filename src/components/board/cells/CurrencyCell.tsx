import { Loader2 } from 'lucide-react'
import { useInlineEdit } from './useInlineEdit'
import { formatCurrency } from '../../../lib/utils'

interface Props {
  value: number
  onSave?: (value: string) => Promise<void>
  className?: string
}

export default function CurrencyCell({ value, onSave, className = '' }: Props) {
  const edit = useInlineEdit(String(value), onSave)

  if (edit.saving) {
    return (
      <span className="flex items-center justify-end gap-1 text-muted">
        <Loader2 size={12} className="animate-spin" />
        <span className="opacity-50 tabular-nums">{formatCurrency(value)}</span>
      </span>
    )
  }

  if (edit.error) return <span className="text-error text-xs">{edit.error}</span>

  if (edit.editing) {
    return (
      <input
        ref={edit.inputRef as React.RefObject<HTMLInputElement>}
        type="number"
        step="0.01"
        min="0"
        value={edit.value}
        onChange={e => edit.setValue(e.target.value)}
        onBlur={e => edit.commit(e.target.value)}
        onKeyDown={edit.onKeyDown}
        className="w-full text-sm font-body border border-teal rounded px-1 py-0.5 bg-white text-right focus:outline-none focus:ring-1 focus:ring-teal"
      />
    )
  }

  return (
    <span
      className={`tabular-nums text-right ${onSave ? 'cursor-pointer hover:bg-teal-pale rounded px-1 -mx-1 transition-colors' : ''} ${className}`}
      onClick={onSave ? edit.start : undefined}
      title={onSave ? 'Click to edit' : undefined}
    >
      {formatCurrency(value)}
    </span>
  )
}
