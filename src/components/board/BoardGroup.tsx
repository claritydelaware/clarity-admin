import { useState, useRef, useEffect, Children, cloneElement, isValidElement } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export interface ColumnSummary {
  id: string
  value?: string
}

interface Props {
  label: string
  count: number
  color: string
  colSpan: number
  summary?: string
  columnSummaries?: ColumnSummary[]
  defaultCollapsed?: boolean
  collapsed?: boolean
  onToggle?: () => void
  children?: React.ReactNode
  selectionState?: 'all' | 'some' | 'none'
  onSelectAll?: () => void
}

export default function BoardGroup({ label, count, color, colSpan, summary, columnSummaries, defaultCollapsed = false, collapsed: controlledCollapsed, onToggle, children, selectionState, onSelectAll }: Props) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed)
  const isControlled = controlledCollapsed !== undefined
  const collapsed = isControlled ? controlledCollapsed : internalCollapsed
  const checkRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!checkRef.current || !selectionState) return
    checkRef.current.checked = selectionState === 'all'
    checkRef.current.indeterminate = selectionState === 'some'
  }, [selectionState])

  const toggle = () => {
    if (isControlled) onToggle?.()
    else setInternalCollapsed(c => !c)
  }

  const coloredChildren = Children.map(children, child => {
    if (isValidElement(child)) {
      return cloneElement(child as React.ReactElement<{ groupColor?: string }>, { groupColor: color })
    }
    return child
  })

  const firstSummaryIdx = columnSummaries?.findIndex(c => c.value) ?? -1
  const useCellLayout = columnSummaries && firstSummaryIdx >= 0
  const labelSpan = useCellLayout ? firstSummaryIdx : colSpan

  return (
    <>
      <tr
        role="row"
        className="cursor-pointer select-none transition-colors"
        style={{ backgroundColor: color }}
        onClick={toggle}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } }}
        tabIndex={0}
        aria-expanded={!collapsed}
      >
        <td
          colSpan={labelSpan}
          className="py-2.5 px-3 border-b border-border/50"
          style={{ borderLeft: `4px solid ${color}` }}
        >
          <div className="flex items-center gap-2">
            {onSelectAll && (
              <input
                ref={checkRef}
                type="checkbox"
                onClick={e => { e.stopPropagation(); onSelectAll() }}
                className="rounded border-white/60 text-teal focus:ring-white cursor-pointer shrink-0"
                aria-label={`Select all ${label} claims`}
              />
            )}
            {collapsed
              ? <ChevronRight size={16} className="shrink-0 text-white" />
              : <ChevronDown size={16} className="shrink-0 text-white" />
            }
            <span className="text-sm font-heading font-semibold text-white">{label}</span>
            <span className="text-xs font-ui font-medium px-2 py-0.5 rounded-full bg-white/20 text-white">
              {count}
            </span>
            {!useCellLayout && summary && (
              <span className="text-xs font-ui text-white/80 tabular-nums">{summary}</span>
            )}
          </div>
        </td>
        {useCellLayout && columnSummaries!.slice(firstSummaryIdx).map(col => (
          <td
            key={col.id}
            className="py-2.5 px-2 border-b border-border/50 text-center"
          >
            {col.value && (
              <span className="text-xs font-ui font-semibold text-white tabular-nums">{col.value}</span>
            )}
          </td>
        ))}
      </tr>
      {!collapsed && coloredChildren}
    </>
  )
}
