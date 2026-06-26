import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  type OnChangeFn,
  type Row,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { RotateCcw, SlidersHorizontal, GripVertical } from 'lucide-react'
import BoardHeader from './BoardHeader'
import BoardRow from './BoardRow'
import BoardGroup from './BoardGroup'
import BoardAddRow from './BoardAddRow'
import { formatCurrency } from '../../lib/utils'
import useLocalStorage from '../../hooks/useLocalStorage'

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
  initialSorting?: SortingState
  storageKey?: string
  onAddRow?: () => void
  addRowLabel?: string
  selectionBar?: React.ReactNode
  compact?: boolean
  emptyMessage?: string
  virtualize?: boolean
}

interface ColumnState { visibility: VisibilityState; order: string[] }
const EMPTY_COL_STATE: ColumnState = { visibility: {}, order: [] }

function buildDefaultVisibility(cols: ColumnDef<unknown, unknown>[]): VisibilityState {
  const vis: VisibilityState = {}
  for (const col of cols) {
    const meta = col.meta as { defaultHidden?: boolean } | undefined
    if (meta?.defaultHidden) {
      const id = (col as { accessorKey?: string; id?: string }).accessorKey ?? (col as { id?: string }).id
      if (id) vis[id] = false
    }
  }
  return vis
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
  initialSorting,
  storageKey,
  onAddRow,
  addRowLabel,
  selectionBar,
  compact = false,
  emptyMessage = 'No data to display.',
  virtualize = false,
}: BoardProps<T>) {
  const [colState, setColState] = useLocalStorage<ColumnState>(
    storageKey ? storageKey + '-board-cols' : '_unused-board-cols',
    EMPTY_COL_STATE,
  )
  const hasSavedState = Object.keys(colState.visibility).length > 0 || colState.order.length > 0
  const initialVisibility = hasSavedState
    ? colState.visibility
    : buildDefaultVisibility(columns as ColumnDef<unknown, unknown>[])
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? [])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialVisibility)
  const [columnOrder, setColumnOrder] = useState<string[]>(colState.order)
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
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: (updater) => {
      setColumnVisibility(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        if (storageKey) setColState({ visibility: next, order: columnOrder })
        return next
      })
    },
    onColumnOrderChange: (updater) => {
      setColumnOrder(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        if (storageKey) setColState({ visibility: columnVisibility, order: next })
        return next
      })
    },
    onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => getRowId(row),
    enableRowSelection,
  })

  const rows = table.getRowModel().rows
  const headerGroups = table.getHeaderGroups()
  const totalColCount = table.getVisibleFlatColumns().length

  // Select-all checkbox
  useEffect(() => {
    if (!selectAllRef.current || !enableRowSelection) return
    const allSelected = rows.length > 0 && rows.every(r => r.getIsSelected())
    const someSelected = rows.some(r => r.getIsSelected())
    selectAllRef.current.checked = allSelected
    selectAllRef.current.indeterminate = !allSelected && someSelected
  })

  useEffect(() => {
    if (!colMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setColMenuOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setColMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [colMenuOpen])

  // Group rows
  const groupedRows = useMemo(() => {
    if (!groupBy) return null
    const map = new Map<string, Row<T>[]>()
    for (const row of rows) {
      const key = groupBy(row.original)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    }
    const order = groupOrder ?? [...map.keys()]
    const result = order.filter(k => map.has(k)).map(k => ({ key: k, rows: map.get(k)! }))
    const remaining = [...map.keys()].filter(k => !order.includes(k))
    for (const k of remaining) result.push({ key: k, rows: map.get(k)! })
    return result
  }, [rows, groupBy, groupOrder])

  const getGroupSelectionState = useCallback((groupRows: Row<T>[]): 'all' | 'some' | 'none' => {
    if (!enableRowSelection || groupRows.length === 0) return 'none'
    const sel = rowSelection ?? {}
    const selectedCount = groupRows.filter(r => sel[r.id]).length
    if (selectedCount === 0) return 'none'
    if (selectedCount === groupRows.length) return 'all'
    return 'some'
  }, [enableRowSelection, rowSelection])

  const toggleGroupSelection = useCallback((groupRows: Row<T>[]) => {
    if (!onRowSelectionChange) return
    const sel = rowSelection ?? {}
    const allSelected = groupRows.every(r => sel[r.id])
    const next = { ...sel }
    for (const r of groupRows) {
      if (allSelected) delete next[r.id]
      else next[r.id] = true
    }
    onRowSelectionChange(next)
  }, [rowSelection, onRowSelectionChange])

  // Virtualization: collapsed state for groups + flat item list
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  type FlatItem = { type: 'group'; key: string; group: { key: string; rows: Row<T>[] } }
    | { type: 'row'; row: Row<T> }
    | { type: 'add-row' }

  const flatItems = useMemo<FlatItem[]>(() => {
    if (!virtualize) return []
    const items: FlatItem[] = []
    if (groupedRows) {
      for (const group of groupedRows) {
        items.push({ type: 'group', key: group.key, group })
        if (!collapsedGroups[group.key]) {
          for (const row of group.rows) {
            items.push({ type: 'row', row })
          }
        }
      }
    } else {
      for (const row of rows) {
        items.push({ type: 'row', row })
      }
    }
    if (onAddRow && addRowLabel) items.push({ type: 'add-row' })
    return items
  }, [virtualize, groupedRows, rows, collapsedGroups, onAddRow, addRowLabel])

  const scrollRef = useRef<HTMLDivElement>(null)
  const rowHeight = compact ? 37 : 45
  const groupHeaderHeight = 41

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => flatItems[i]?.type === 'group' ? groupHeaderHeight : rowHeight,
    overscan: 15,
    enabled: virtualize && flatItems.length > 0,
  })

  const allColumns = table.getAllLeafColumns()
  const hideableColumns = allColumns.filter(c => c.getCanHide())

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
    if (storageKey) setColState({ visibility: columnVisibility, order: ids })
    dragItem.current = null; dragOverItem.current = null
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-1.5">
        {JSON.stringify(sorting) !== JSON.stringify(initialSorting ?? []) ? (
          <button
            type="button"
            onClick={() => setSorting(initialSorting ?? [])}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-teal font-ui transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
          >
            <RotateCcw size={11} /> Reset sort
          </button>
        ) : <div />}

        <div className="relative" ref={colMenuRef}>
          <button
            type="button"
            onClick={() => setColMenuOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={colMenuOpen}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-teal font-ui transition-colors border border-border rounded-lg px-2.5 py-1.5 bg-white hover:border-teal/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            <SlidersHorizontal size={11} />
            Columns
          </button>

          {colMenuOpen && (
            <div role="menu" className="absolute right-0 top-full mt-1 z-30 w-56 bg-white border border-border rounded-lg shadow-lg py-2 animate-slide-down">
              <p className="px-3 pb-1.5 text-[10px] font-medium text-muted uppercase tracking-wide border-b border-border mb-1">
                Columns · drag to reorder
              </p>
              {hideableColumns.map((col, idx) => (
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
                    const defaults = buildDefaultVisibility(columns as ColumnDef<unknown, unknown>[])
                    setColumnVisibility(defaults)
                    setColumnOrder([])
                    if (storageKey) setColState({ visibility: defaults, order: [] })
                  }}
                  className="text-xs text-muted hover:text-teal font-ui transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
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
      {virtualize ? (
        <div ref={scrollRef} className="overflow-auto rounded-lg border border-border bg-white" style={{ maxHeight: 'calc(100vh - 240px)' }}>
          <table className="w-full text-sm font-body" role="grid" aria-label="Data board">
            <BoardHeader headerGroups={headerGroups} sticky />
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={totalColCount} className="px-4 py-12 text-center text-muted text-sm">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                <>
                  {virtualizer.getVirtualItems()[0]?.start > 0 && (
                    <tr><td colSpan={totalColCount} style={{ height: virtualizer.getVirtualItems()[0].start }} /></tr>
                  )}
                  {virtualizer.getVirtualItems().map(vItem => {
                    const item = flatItems[vItem.index]
                    if (item.type === 'group') {
                      const cfg = groupConfig?.[item.key]
                      const color = cfg?.color ?? '#C4C4C4'
                      const label = cfg?.label ?? item.key
                      const summary = cfg?.summarize
                        ? cfg.summarize(item.group.rows as Row<never>[])
                        : formatCurrency(item.group.rows.reduce((sum, r) => {
                            const v = (r.original as Record<string, unknown>)['totalPayment']
                            return sum + (typeof v === 'number' ? v : 0)
                          }, 0))
                      return (
                        <BoardGroup
                          key={item.key}
                          label={label}
                          count={item.group.rows.length}
                          color={color}
                          colSpan={totalColCount}
                          summary={summary}
                          collapsed={!!collapsedGroups[item.key]}
                          onToggle={() => toggleGroup(item.key)}
                          selectionState={enableRowSelection ? getGroupSelectionState(item.group.rows) : undefined}
                          onSelectAll={enableRowSelection ? () => toggleGroupSelection(item.group.rows) : undefined}
                        />
                      )
                    }
                    if (item.type === 'add-row') {
                      return <BoardAddRow key="__add" onClick={onAddRow!} label={addRowLabel!} colSpan={totalColCount} />
                    }
                    return <BoardRow key={item.row.id} row={item.row} compact={compact} />
                  })}
                  {(() => {
                    const vItems = virtualizer.getVirtualItems()
                    const last = vItems[vItems.length - 1]
                    const remaining = last ? virtualizer.getTotalSize() - last.end : 0
                    return remaining > 0 ? <tr><td colSpan={totalColCount} style={{ height: remaining }} /></tr> : null
                  })()}
                </>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-white">
          <table className="w-full text-sm font-body" role="grid" aria-label="Data board">
            <BoardHeader headerGroups={headerGroups} />
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
                      selectionState={enableRowSelection ? getGroupSelectionState(group.rows) : undefined}
                      onSelectAll={enableRowSelection ? () => toggleGroupSelection(group.rows) : undefined}
                    >
                      {group.rows.map(row => (
                        <BoardRow key={row.id} row={row} compact={compact} />
                      ))}
                    </BoardGroup>
                  )
                })
              ) : (
                rows.map(row => (
                  <BoardRow key={row.id} row={row} compact={compact} />
                ))
              )}

              {onAddRow && addRowLabel && (
                <BoardAddRow onClick={onAddRow} label={addRowLabel} colSpan={totalColCount} />
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
