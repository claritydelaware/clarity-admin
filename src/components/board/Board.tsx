import { useState, useRef, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  type OnChangeFn,
  type Row,
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, RotateCcw, SlidersHorizontal, GripVertical } from 'lucide-react'
import BoardGroup from './BoardGroup'
import BoardAddRow from './BoardAddRow'
import { formatCurrency } from '../../lib/utils'
import Button from '../ui/Button'

interface GroupConfig {
  color: string
  label: string
  summarize?: (rows: Row<never>[]) => string
}

interface BoardProps<T> {
  data: T[]
  columns: ColumnDef<T, unknown>[]
  getRowId: (row: T) => string
  groupBy?: (row: T) => string
  groupOrder?: string[]
  groupConfig?: Record<string, GroupConfig>
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  enableRowSelection?: boolean
  pageSize?: number
  storageKey?: string
  addRowPath?: string
  addRowLabel?: string
  selectionBar?: React.ReactNode
  compact?: boolean
  emptyMessage?: string
}

const COL_STORAGE_SUFFIX = '-board-cols'

function loadColumnState(key: string): { visibility: VisibilityState; order: string[] } | null {
  try {
    const raw = localStorage.getItem(key + COL_STORAGE_SUFFIX)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveColumnState(key: string, visibility: VisibilityState, order: string[]) {
  try {
    localStorage.setItem(key + COL_STORAGE_SUFFIX, JSON.stringify({ visibility, order }))
  } catch {}
}

export default function Board<T>({
  data,
  columns,
  getRowId,
  groupBy,
  groupOrder,
  groupConfig,
  rowSelection,
  onRowSelectionChange,
  enableRowSelection = false,
  pageSize = 50,
  storageKey,
  addRowPath,
  addRowLabel,
  selectionBar,
  compact = false,
  emptyMessage = 'No data to display.',
}: BoardProps<T>) {
  const saved = storageKey ? loadColumnState(storageKey) : null
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(saved?.visibility ?? {})
  const [columnOrder, setColumnOrder] = useState<string[]>(saved?.order ?? [])
  const [colMenuOpen, setColMenuOpen] = useState(false)
  const colMenuRef = useRef<HTMLDivElement>(null)
  const selectAllRef = useRef<HTMLInputElement>(null)

  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnOrder: columnOrder.length ? columnOrder : undefined,
      rowSelection: rowSelection ?? {},
      pagination: { pageIndex: 0, pageSize },
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: (updater) => {
      setColumnVisibility(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        if (storageKey) saveColumnState(storageKey, next, columnOrder)
        return next
      })
    },
    onColumnOrderChange: (updater) => {
      setColumnOrder(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        if (storageKey) saveColumnState(storageKey, columnVisibility, next)
        return next
      })
    },
    onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => getRowId(row),
    enableRowSelection,
  })

  const rows = table.getRowModel().rows
  const headerGroups = table.getHeaderGroups()
  const totalColCount = table.getVisibleFlatColumns().length

  // Pagination
  const pageCount = table.getPageCount()
  const canPrev = table.getCanPreviousPage()
  const canNext = table.getCanNextPage()
  const pageIndex = table.getState().pagination.pageIndex

  // Select-all checkbox
  useEffect(() => {
    if (!selectAllRef.current || !enableRowSelection) return
    const allSelected = rows.length > 0 && rows.every(r => r.getIsSelected())
    const someSelected = rows.some(r => r.getIsSelected())
    selectAllRef.current.checked = allSelected
    selectAllRef.current.indeterminate = !allSelected && someSelected
  })

  // Close column menu on outside click
  useEffect(() => {
    if (!colMenuOpen) return
    const handle = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setColMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [colMenuOpen])

  // Group rows
  let groupedRows: { key: string; rows: Row<T>[] }[] | null = null
  if (groupBy) {
    const map = new Map<string, Row<T>[]>()
    for (const row of rows) {
      const key = groupBy(row.original)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    }
    const order = groupOrder ?? [...map.keys()]
    groupedRows = order.filter(k => map.has(k)).map(k => ({ key: k, rows: map.get(k)! }))
    const remaining = [...map.keys()].filter(k => !order.includes(k))
    for (const k of remaining) groupedRows.push({ key: k, rows: map.get(k)! })
  }

  const allColumns = table.getAllLeafColumns()
  const rowPy = compact ? 'py-1.5' : 'py-2.5'

  function handleDragStart(idx: number) { dragItem.current = idx }
  function handleDragOver(e: React.DragEvent, idx: number) { e.preventDefault(); dragOverItem.current = idx }
  function handleDrop() {
    if (dragItem.current == null || dragOverItem.current == null || dragItem.current === dragOverItem.current) {
      dragItem.current = null; dragOverItem.current = null; return
    }
    const ids = allColumns.map(c => c.id)
    const [moved] = ids.splice(dragItem.current, 1)
    ids.splice(dragOverItem.current, 0, moved)
    setColumnOrder(ids)
    if (storageKey) saveColumnState(storageKey, columnVisibility, ids)
    dragItem.current = null; dragOverItem.current = null
  }

  function renderRow(row: Row<T>) {
    const selected = row.getIsSelected()
    return (
      <tr
        key={row.id}
        className={[
          'transition-colors border-b border-border/50',
          selected ? 'bg-teal-pale/40' : 'hover:bg-surface-sunken/50',
        ].join(' ')}
      >
        {row.getVisibleCells().map(cell => (
          <td key={cell.id} className={`px-4 ${rowPy} text-sm`}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-1.5">
        {sorting.length > 0 ? (
          <button
            type="button"
            onClick={() => setSorting([])}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-teal font-ui transition-colors"
          >
            <RotateCcw size={11} /> Reset sort
          </button>
        ) : <div />}

        <div className="relative" ref={colMenuRef}>
          <button
            type="button"
            onClick={() => setColMenuOpen(o => !o)}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-teal font-ui transition-colors border border-border rounded-lg px-2.5 py-1.5 bg-white hover:border-teal/40"
          >
            <SlidersHorizontal size={11} />
            Columns
          </button>

          {colMenuOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 w-56 bg-white border border-border rounded-lg shadow-lg py-2 animate-slide-down">
              <p className="px-3 pb-1.5 text-[10px] font-medium text-muted uppercase tracking-wide border-b border-border mb-1">
                Columns · drag to reorder
              </p>
              {allColumns.map((col, idx) => (
                <div
                  key={col.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={handleDrop}
                  className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-surface-sunken group cursor-default"
                >
                  <GripVertical size={14} className="text-gray-300 group-hover:text-gray-400 cursor-grab shrink-0" />
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-body text-ink flex-1 select-none">
                    <input
                      type="checkbox"
                      checked={col.getIsVisible()}
                      onChange={col.getToggleVisibilityHandler()}
                      onClick={e => e.stopPropagation()}
                      className="rounded border-gray-300 text-teal focus:ring-teal cursor-pointer"
                    />
                    {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
                  </label>
                </div>
              ))}
              <div className="border-t border-border mt-1 pt-1 px-3">
                <button
                  type="button"
                  onClick={() => {
                    setColumnVisibility({})
                    setColumnOrder([])
                    if (storageKey) saveColumnState(storageKey, {}, [])
                  }}
                  className="text-xs text-muted hover:text-teal font-ui transition-colors"
                >
                  Reset to defaults
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selection bar */}
      {selectionBar}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full text-sm font-body">
          <thead className="bg-surface-sunken border-b border-border">
            {headerGroups.map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className={[
                      'px-4 py-2.5 text-left text-[11px] font-ui font-medium text-muted uppercase tracking-wider whitespace-nowrap',
                      header.column.getCanSort() ? 'cursor-pointer select-none hover:text-ink' : '',
                    ].join(' ')}
                    onClick={header.column.getToggleSortingHandler()}
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
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={totalColCount} className="px-4 py-12 text-center text-muted text-sm">
                  {emptyMessage}
                </td>
              </tr>
            )}

            {groupedRows ? (
              groupedRows.map(group => {
                const cfg = groupConfig?.[group.key]
                const color = cfg?.color ?? '#C4C4C4'
                const label = cfg?.label ?? group.key
                const summary = cfg?.summarize
                  ? cfg.summarize(group.rows as Row<never>[])
                  : formatCurrency(group.rows.reduce((sum, r) => {
                      const v = (r.original as Record<string, unknown>)['totalPayment']
                      return sum + (typeof v === 'number' ? v : 0)
                    }, 0))

                return (
                  <BoardGroup
                    key={group.key}
                    label={label}
                    count={group.rows.length}
                    color={color}
                    colSpan={totalColCount}
                    summary={summary}
                  >
                    {group.rows.map(renderRow)}
                  </BoardGroup>
                )
              })
            ) : (
              rows.map(renderRow)
            )}

            {addRowPath && addRowLabel && (
              <BoardAddRow to={addRowPath} label={addRowLabel} colSpan={totalColCount} />
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm font-ui text-muted">
          <span>{data.length} items · page {pageIndex + 1} of {pageCount}</span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!canPrev}
            >
              Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!canNext}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
