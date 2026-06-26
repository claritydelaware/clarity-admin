import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Props {
  label: string
  count: number
  color: string
  colSpan: number
  summary?: string
  defaultCollapsed?: boolean
  collapsed?: boolean
  onToggle?: () => void
  children?: React.ReactNode
  selectionState?: 'all' | 'some' | 'none'
  onSelectAll?: () => void
}

export default function BoardGroup({ label, count, color, colSpan, summary, defaultCollapsed = false, collapsed: controlledCollapsed, onToggle, children, selectionState, onSelectAll }: Props) {
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

  return (
    <>
      <tr
        role="row"
        className="cursor-pointer select-none hover:bg-surface-sunken/50 transition-colors"
        onClick={toggle}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } }}
        tabIndex={0}
        aria-expanded={!collapsed}
      >
        <td
          colSpan={colSpan}
          className="py-2 px-3"
          style={{ borderLeft: `4px solid ${color}` }}
        >
          <div className="flex items-center gap-2">
            {onSelectAll && (
              <input
                ref={checkRef}
                type="checkbox"
                onClick={e => { e.stopPropagation(); onSelectAll() }}
                className="rounded border-gray-300 text-teal focus:ring-teal cursor-pointer shrink-0"
                aria-label={`Select all ${label} claims`}
              />
            )}
            {collapsed
              ? <ChevronRight size={16} className="text-muted shrink-0" />
              : <ChevronDown size={16} className="text-muted shrink-0" />
            }
            <span className="text-sm font-heading font-semibold text-ink">{label}</span>
            <span className="text-xs font-ui text-muted bg-surface-sunken px-2 py-0.5 rounded-full">
              {count}
            </span>
            {summary && (
              <span className="ml-auto text-xs font-ui text-muted tabular-nums">{summary}</span>
            )}
          </div>
        </td>
      </tr>
      {!collapsed && children}
    </>
  )
}
