import { flexRender, type Row } from '@tanstack/react-table'

interface Props<T> {
  row: Row<T>
  compact?: boolean
  groupColor?: string
}

export default function BoardRow<T>({ row, compact = false, groupColor }: Props<T>) {
  const selected = row.getIsSelected()
  const rowPy = compact ? 'py-1' : 'py-1.5'
  const cells = row.getVisibleCells()

  return (
    <tr
      role="row"
      className={[
        'group transition-colors',
        selected ? 'bg-teal-pale/40' : 'hover:bg-surface-sunken/50',
      ].join(' ')}
    >
      {cells.map((cell, i) => {
        const meta = cell.column.columnDef.meta as { align?: string; cellBg?: (row: Row<T>) => string | undefined } | undefined
        const align = meta?.align
        const cellBg = meta?.cellBg?.(row)
        const isFirst = i === 0
        const alignClass = align === 'center' ? ' text-center' : ''
        return (
          <td
            key={cell.id}
            role="gridcell"
            className={`${rowPy} text-sm border-r border-b border-border-strong/40 last:border-r-0${alignClass}`}
            style={{
              borderLeft: isFirst && groupColor ? `3px solid ${groupColor}` : undefined,
              backgroundColor: cellBg,
              padding: cellBg ? 0 : undefined,
              paddingLeft: !cellBg ? (isFirst && groupColor ? '5px' : '8px') : undefined,
              paddingRight: !cellBg ? '8px' : undefined,
            }}
          >
            {cellBg ? (
              <div className={`flex items-center justify-center w-full h-full ${rowPy} px-2`}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )}
          </td>
        )
      })}
    </tr>
  )
}
