import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Props {
  label: string
  count: number
  color: string
  colSpan: number
  summary?: string
  defaultCollapsed?: boolean
  children: React.ReactNode
}

export default function BoardGroup({ label, count, color, colSpan, summary, defaultCollapsed = false, children }: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  return (
    <>
      <tr
        role="row"
        className="cursor-pointer select-none hover:bg-surface-sunken/50 transition-colors"
        onClick={() => setCollapsed(c => !c)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed(c => !c) } }}
        tabIndex={0}
        aria-expanded={!collapsed}
      >
        <td
          colSpan={colSpan}
          className="py-2 px-4"
          style={{ borderLeft: `4px solid ${color}` }}
        >
          <div className="flex items-center gap-2">
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
