import { Fragment, useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAttention } from '../../hooks/useAttention'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { NAV_GROUPS } from './navConfig'

const HOVER_COLLAPSE_DELAY_MS = 400

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
  const { byRoute } = useAttention()

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
          'flex items-center gap-3 overflow-hidden transition-[padding] duration-300',
          expanded ? 'px-5 py-4' : 'px-0 py-4 justify-center',
        ].join(' ')}>
          <img
            src="/clarity-logo-white_icon.png"
            alt="Clarity Counseling"
            className="object-contain h-9 w-9 shrink-0"
          />
          {expanded && (
            <span className="text-sm font-heading font-semibold text-white whitespace-nowrap leading-tight">
              Clarity Counseling<span className="block text-[10px] font-ui font-medium uppercase tracking-widest text-white/50">Admin</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-1 px-2" aria-label="Main">
          {NAV_GROUPS.map((group, gi) => (
            <Fragment key={group.label}>
              {expanded ? (
                <p className={`px-3 pb-1 text-[10px] font-ui font-semibold uppercase tracking-widest text-white/50 whitespace-nowrap ${gi === 0 ? 'pt-1' : 'pt-4'}`}>
                  {group.label}
                </p>
              ) : (
                gi > 0 && <div className="mx-3 my-2 border-t border-white/10" aria-hidden="true" />
              )}
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon }) => {
                  const isActive = location.pathname.startsWith(to)
                  const badge = byRoute[to]
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={onClose}
                      title={!expanded ? label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                      className={[
                        'relative flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                        isActive
                          ? 'bg-white/15 text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white',
                      ].join(' ')}
                    >
                      {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gold" aria-hidden="true" />}
                      <span className="relative shrink-0">
                        <Icon size={17} strokeWidth={1.75} />
                        {badge && !expanded && (
                          <span className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ring-2 ring-teal ${badge.level === 'danger' ? 'bg-error' : 'bg-gold'}`} />
                        )}
                      </span>
                      {expanded && (
                        <>
                          <span className={`text-sm whitespace-nowrap ${isActive ? 'font-medium' : ''}`}>{label}</span>
                          {badge && (
                            <span
                              className={`ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-ui font-semibold tabular-nums ${badge.level === 'danger' ? 'bg-error text-white' : 'bg-gold text-ink'}`}
                              aria-label={`${badge.count} item${badge.count !== 1 ? 's' : ''} need attention`}
                            >
                              {badge.count}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </Fragment>
          ))}
        </nav>

        {/* Footer + collapse toggle */}
        <div className="border-t border-white/10">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-full flex items-center gap-2 px-5 py-3 text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-inset"
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
