import { useRef, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, TrendingUp, BarChart2, Receipt, Calendar, Users, ChevronLeft, ChevronRight } from 'lucide-react'

const NAV = [
  { to: '/dashboard',   label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/analytics',   label: 'Analytics',        icon: BarChart2 },
  { to: '/claims',      label: 'Claims',           icon: FileText },
  { to: '/pay-periods', label: 'Pay Periods',      icon: Calendar },
  { to: '/forecast',    label: 'Revenue Forecast', icon: TrendingUp },
  { to: '/overhead',    label: 'Overhead',         icon: Receipt },
  { to: '/staff',       label: 'Staff',            icon: Users },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: Props) {
  const location = useLocation()
  const activeIndex = NAV.findIndex(item => location.pathname.startsWith(item.to))
  const navRef = useRef<HTMLElement>(null)
  const [indicator, setIndicator] = useState<{ top: number; height: number } | null>(null)

  useEffect(() => {
    if (!navRef.current || activeIndex < 0) return
    const items = navRef.current.querySelectorAll('a')
    const el = items[activeIndex] as HTMLElement | undefined
    if (el) setIndicator({ top: el.offsetTop, height: el.offsetHeight })
  }, [activeIndex, isCollapsed])

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
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200',
          'transition-[width,transform] duration-300 ease-in-out',
          isCollapsed ? 'w-16' : 'w-60',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Brand */}
        <div className={[
          'flex items-center border-b border-gray-100 overflow-hidden transition-[padding] duration-300',
          isCollapsed ? 'px-0 py-4 justify-center' : 'px-5 py-4',
        ].join(' ')}>
          <img
            src="/new-clarity-logo-transparent.png"
            alt="Clarity Counseling"
            className={[
              'object-contain transition-[height,width] duration-300',
              isCollapsed ? 'h-7 w-7' : 'h-10 w-auto',
            ].join(' ')}
          />
        </div>

        {/* Nav */}
        <nav ref={navRef} className="flex-1 overflow-y-auto py-3 relative">
          {/* Sliding active indicator */}
          {indicator && activeIndex >= 0 && (
            <div
              className="absolute left-0 w-0.5 bg-gold pointer-events-none rounded-r"
              style={{
                top: indicator.top,
                height: indicator.height,
                transition: 'top 0.25s ease-in-out, height 0.25s ease-in-out',
              }}
            />
          )}
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              title={isCollapsed ? label : undefined}
              className={({ isActive }) =>
                [
                  'flex items-center py-2.5 transition-colors',
                  isCollapsed ? 'justify-center px-0' : 'gap-3 pl-5 pr-6',
                  isActive
                    ? 'bg-teal-pale text-teal font-medium'
                    : 'text-muted hover:text-teal hover:bg-gray-50',
                ].join(' ')
              }
            >
              <Icon size={17} strokeWidth={1.75} />
              {!isCollapsed && <span className="text-sm">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer + collapse toggle */}
        <div className="border-t border-gray-100">
          {!isCollapsed && (
            <p className="px-6 py-3 text-xs text-muted font-body">Clarity Counseling of Delaware</p>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={[
              'w-full flex items-center py-3 text-muted hover:text-teal hover:bg-gray-50 transition-colors border-t border-gray-100',
              isCollapsed ? 'justify-center px-0' : 'gap-2 px-6',
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
