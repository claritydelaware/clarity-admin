import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, TrendingUp, BarChart2, Receipt, Calendar, Users } from 'lucide-react'

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
}

export default function Sidebar({ isOpen, onClose }: Props) {
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
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-white border-r border-gray-200',
          'transition-transform duration-300 ease-in-out',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Brand */}
        <div className="flex items-center px-5 py-4 border-b border-gray-100">
          <img
            src="/new-clarity-logo-transparent.png"
            alt="Clarity Counseling"
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 py-2.5 pl-5 pr-6 text-sm transition-colors border-l-2',
                  isActive
                    ? 'border-gold bg-teal-pale text-teal font-medium'
                    : 'border-transparent text-muted hover:text-teal hover:bg-gray-50',
                ].join(' ')
              }
            >
              <Icon size={17} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <p className="text-xs text-muted font-body">Clarity Counseling of Delaware</p>
        </div>
      </aside>
    </>
  )
}
