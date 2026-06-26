import { flexRender, type Row } from '@tanstack/react-table'

interface Props<T> {
  row: Row<T>
  compact?: boolean
}

export default function BoardRow<T>({ row, compact = false }: Props<T>) {
  const selected = row.getIsSelected()
  const rowPy = compact ? 'py-1.5' : 'py-2.5'

  return (
    <tr
      role="row"
      className={[
        'group transition-colors border-b border-border/50',
        selected ? 'bg-teal-pale/40' : 'hover:bg-surface-sunken/50',
      ].join(' ')}
    >
      {row.getVisibleCells().map(cell => {
        const align = (cell.column.columnDef.meta as { align?: string } | undefined)?.align
        return (
          <td key={cell.id} role="gridcell" className={`px-3 ${rowPy} text-sm${align === 'center' ? ' text-center' : ''}`}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        )
      })}
    </tr>
  )
}
