import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, TrendingUp, BarChart2, Receipt, Calendar, Users, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react'

const NAV = [
  { to: '/dashboard',   label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/analytics',   label: 'Analytics',        icon: BarChart2 },
  { to: '/claims',      label: 'Claims',           icon: FileText },
  { to: '/pay-periods', label: 'Pay Periods',      icon: Calendar },
  { to: '/forecast',    label: 'Revenue Forecast', icon: TrendingUp },
  { to: '/overhead',    label: 'Overhead',         icon: Receipt },
  { to: '/staff',       label: 'Staff',            icon: Users },
  { to: '/caseloads',   label: 'Caseloads',        icon: ClipboardList },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: Props) {
  const location = useLocation()

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
        className={[
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-teal',
          'transition-[width,transform] duration-300 ease-in-out',
          isCollapsed ? 'w-16' : 'w-60',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Brand */}
        <div className={[
          'flex items-center overflow-hidden transition-[padding] duration-300',
          isCollapsed ? 'px-0 py-4 justify-center' : 'px-5 py-4',
        ].join(' ')}>
          <img
            src={isCollapsed ? '/clarity-logo-white_icon.png' : '/clarity-logo-white.png'}
            alt="Clarity Counseling"
            className={[
              'object-contain transition-[height,width] duration-300',
              isCollapsed ? 'h-9 w-9' : 'h-12 w-auto',
            ].join(' ')}
          />
        </div>

        {/* Workspace label */}
        {!isCollapsed && (
          <div className="px-5 pb-2">
            <span className="text-[10px] font-ui font-semibold uppercase tracking-widest text-white/40">
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
                title={isCollapsed ? label : undefined}
                className={[
                  'flex items-center rounded-lg transition-colors duration-150',
                  isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:bg-white/8 hover:text-white/90',
                ].join(' ')}
              >
                <Icon size={17} strokeWidth={1.75} />
                {!isCollapsed && (
                  <span className={`text-sm ${isActive ? 'font-medium' : ''}`}>{label}</span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer + collapse toggle */}
        <div className="border-t border-white/10">
          {!isCollapsed && (
            <p className="px-5 py-3 text-[11px] text-white/30 font-body">
              Clarity Counseling of Delaware
            </p>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={[
              'w-full flex items-center py-3 text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors border-t border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-inset',
              isCollapsed ? 'justify-center px-0' : 'gap-2 px-5',
            ].join(' ')}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed
              ? <ChevronRight size={15} />
              : <>
                  <ChevronLeft size={15} />
                  <span className="text-xs font-body">Collapse</span>
                </>
            }
          </button>
        </div>
      </aside>
    </>
  )
}
