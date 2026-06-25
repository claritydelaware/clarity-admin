import { Plus } from 'lucide-react'

interface Props {
  onClick: () => void
  label: string
  colSpan: number
}

export default function BoardAddRow({ onClick, label, colSpan }: Props) {
  return (
    <tr className="border-t border-dashed border-border">
      <td colSpan={colSpan} className="px-4 py-2">
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className="inline-flex items-center gap-1.5 text-sm font-ui text-muted hover:text-teal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
        >
          <Plus size={14} />
          {label}
        </button>
      </td>
    </tr>
  )
}
