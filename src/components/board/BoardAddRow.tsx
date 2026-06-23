import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

interface Props {
  to: string
  label: string
  colSpan: number
}

export default function BoardAddRow({ to, label, colSpan }: Props) {
  return (
    <tr className="border-t border-dashed border-border">
      <td colSpan={colSpan} className="px-4 py-2">
        <Link
          to={to}
          className="inline-flex items-center gap-1.5 text-sm font-ui text-muted hover:text-teal transition-colors"
        >
          <Plus size={14} />
          {label}
        </Link>
      </td>
    </tr>
  )
}
