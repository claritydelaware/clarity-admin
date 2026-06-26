import { flexRender, type HeaderGroup } from '@tanstack/react-table'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface Props<T> {
  headerGroups: HeaderGroup<T>[]
  sticky?: boolean
}

export default function BoardHeader<T>({ headerGroups, sticky = false }: Props<T>) {
  return (
    <thead className={`bg-surface-sunken border-b border-border${sticky ? ' sticky top-0 z-10' : ''}`}>
      {headerGroups.map(hg => (
        <tr key={hg.id} role="row">
          {hg.headers.map(header => {
            const sorted = header.column.getIsSorted()
            const align = (header.column.columnDef.meta as { align?: string } | undefined)?.align
            return (
              <th
                key={header.id}
                role="columnheader"
                aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                tabIndex={header.column.getCanSort() ? 0 : undefined}
                className={[
                  'px-3 py-2.5 text-[11px] font-ui font-medium text-muted uppercase tracking-wider whitespace-nowrap',
                  align === 'center' ? 'text-center' : 'text-left',
                  header.column.getCanSort() ? 'cursor-pointer select-none hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-inset' : '',
                ].join(' ')}
                onClick={header.column.getToggleSortingHandler()}
                onKeyDown={e => {
                  if (header.column.getCanSort() && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    header.column.getToggleSortingHandler()?.(e)
                  }
                }}
                style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
              >
                <span className="inline-flex items-center gap-0.5">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() === 'asc' && <ChevronUp size={13} />}
                  {header.column.getIsSorted() === 'desc' && <ChevronDown size={13} />}
                  {header.column.getCanSort() && !header.column.getIsSorted() && (
                    <ChevronDown size={13} className="opacity-20" />
                  )}
                </span>
              </th>
            )
          })}
        </tr>
      ))}
    </thead>
  )
}
