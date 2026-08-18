import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, TrendingUp, BarChart2, Receipt, Calendar, Users, ClipboardList, Landmark, Activity, ShieldCheck, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react'

export const NAV = [
  { to: '/dashboard',          label: 'Dashboard',          icon: LayoutDashboard },
  { to: '/analytics',          label: 'Analytics',          icon: BarChart2 },
  { to: '/claims',             label: 'Claims',             icon: FileText },
  { to: '/pay-periods',        label: 'Pay Periods',        icon: Calendar },
  { to: '/hourly-performance', label: 'Hourly Performance', icon: Activity },
  { to: '/forecast',           label: 'Revenue Forecast',   icon: TrendingUp },
  { to: '/overhead',           label: 'Overhead',           icon: Receipt },
  { to: '/staff',              label: 'Staff',              icon: Users },
  { to: '/credentialing',      label: 'Credentialing',      icon: ShieldCheck },
  { to: '/ce-tracker',         label: 'CE Tracker',         icon: GraduationCap },
  { to: '/caseloads',          label: 'Caseloads',          icon: ClipboardList },
  { to: '/valuation',          label: 'Valuation',          icon: Landmark },
]

const HOVER_COLLAPSE_DELAY_MS = 200

interface Props {
  isOpen: boolean
  onClose: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: Props) {
  const location = useLocation()
  const [isHovering, setIsHovering] = useState(false)
  const collapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current)
    }
  }, [])

  function handleMouseEnter() {
    if (!isCollapsed) return
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current)
      collapseTimeoutRef.current = null
    }
    setIsHovering(true)
  }

  function handleMouseLeave() {
    if (!isCollapsed) return
    collapseTimeoutRef.current = setTimeout(() => setIsHovering(false), HOVER_COLLAPSE_DELAY_MS)
  }

  // Visually expanded — either pinned open, or temporarily hover-expanded while pinned collapsed.
  const expanded = !isCollapsed || isHovering

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={[
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-teal overflow-hidden',
          'transition-[width,transform,box-shadow] duration-300 ease-in-out',
          expanded ? 'w-60' : 'w-16',
          isHovering && isCollapsed ? 'shadow-2xl' : '',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Brand */}
        <div className={[
          'flex items-center overflow-hidden transition-[padding] duration-300',
          expanded ? 'px-5 py-4' : 'px-0 py-4 justify-center',
        ].join(' ')}>
          <img
            src={expanded ? '/clarity-logo-white.png' : '/clarity-logo-white_icon.png'}
            alt="Clarity Counseling"
            className={[
              'object-contain transition-[height,width] duration-300',
              expanded ? 'h-12 w-auto' : 'h-9 w-9',
            ].join(' ')}
          />
        </div>

        {/* Workspace label */}
        {expanded && (
          <div className="px-5 pb-2">
            <span className="text-[10px] font-ui font-semibold uppercase tracking-widest text-white/40 whitespace-nowrap">
              Clarity Counseling
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-1 px-2 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                title={!expanded ? label : undefined}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:bg-white/8 hover:text-white/90',
                ].join(' ')}
              >
                <Icon size={17} strokeWidth={1.75} className="shrink-0" />
                {expanded && (
                  <span className={`text-sm whitespace-nowrap ${isActive ? 'font-medium' : ''}`}>{label}</span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer + collapse toggle */}
        <div className="border-t border-white/10">
          {expanded && (
            <p className="px-5 py-3 text-[11px] text-white/30 font-body whitespace-nowrap">
              Clarity Counseling of Delaware
            </p>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-full flex items-center gap-2 px-5 py-3 text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors border-t border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-inset"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed
              ? <ChevronRight size={15} />
              : <ChevronLeft size={15} />
            }
            {expanded && (
              <span className="text-xs font-body whitespace-nowrap">{isCollapsed ? 'Expand' : 'Collapse'}</span>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
