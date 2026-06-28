import { useRef, useCallback, type MouseEvent } from 'react'
import { flexRender, type HeaderGroup, type Header } from '@tanstack/react-table'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface Props<T> {
  headerGroups: HeaderGroup<T>[]
  sticky?: boolean
}

export default function BoardHeader<T>({ headerGroups, sticky = false }: Props<T>) {
  const wasResizing = useRef(false)

  const handleResizeStart = useCallback(<U,>(header: Header<U, unknown>, e: MouseEvent | React.TouchEvent) => {
    wasResizing.current = true
    header.getResizeHandler()(e)
  }, [])

  return (
    <thead className={`bg-surface-sunken border-b border-border${sticky ? ' sticky top-0 z-10' : ''}`}>
      {headerGroups.map(hg => (
        <tr key={hg.id} role="row">
          {hg.headers.map(header => {
            const sorted = header.column.getIsSorted()
            const align = (header.column.columnDef.meta as { align?: string } | undefined)?.align
            const canResize = header.column.getCanResize()
            return (
              <th
                key={header.id}
                role="columnheader"
                aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                tabIndex={header.column.getCanSort() ? 0 : undefined}
                className={[
                  'relative px-2 py-1.5 text-[11px] font-ui font-medium text-muted uppercase tracking-wider whitespace-nowrap border-r border-border-strong/40 last:border-r-0',
                  align === 'center' ? 'text-center' : 'text-left',
                  header.column.getCanSort() ? 'cursor-pointer select-none hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-inset' : '',
                ].join(' ')}
                onClick={e => {
                  if (wasResizing.current) {
                    wasResizing.current = false
                    return
                  }
                  header.column.getToggleSortingHandler()?.(e)
                }}
                onKeyDown={e => {
                  if (header.column.getCanSort() && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    header.column.getToggleSortingHandler()?.(e)
                  }
                }}
                style={{ width: header.getSize() }}
              >
                <span className="inline-flex items-center gap-0.5">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() === 'asc' && <ChevronUp size={13} />}
                  {header.column.getIsSorted() === 'desc' && <ChevronDown size={13} />}
                  {header.column.getCanSort() && !header.column.getIsSorted() && (
                    <ChevronDown size={13} className="opacity-20" />
                  )}
                </span>
                {canResize && (
                  <div
                    onMouseDown={e => handleResizeStart(header, e)}
                    onTouchStart={e => handleResizeStart(header, e)}
                    onClick={e => e.stopPropagation()}
                    className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none hover:bg-teal/40 ${
                      header.column.getIsResizing() ? 'bg-teal/60' : ''
                    }`}
                  />
                )}
              </th>
            )
          })}
        </tr>
      ))}
    </thead>
  )
}
