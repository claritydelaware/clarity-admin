import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText } from 'lucide-react'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/claims',    label: 'Claims',    icon: FileText },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: Props) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-teal',
          'transition-transform duration-300 ease-in-out',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Brand */}
        <div className="flex items-center px-6 py-5 border-b border-white/10">
          <span className="font-heading text-white text-lg font-semibold tracking-tight">
            Clarity Admin
          </span>
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
                    ? 'border-gold bg-white/10 text-white font-medium'
                    : 'border-transparent text-white/65 hover:text-white hover:bg-white/5',
                ].join(' ')
              }
            >
              <Icon size={17} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10">
          <p className="text-xs text-white/40 font-body">Clarity Counseling of Delaware</p>
        </div>
      </aside>
    </>
  )
}
