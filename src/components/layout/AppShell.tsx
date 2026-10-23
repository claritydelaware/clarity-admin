import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import CommandPalette from '../CommandPalette'
import { ToastProvider } from '../../context/ToastContext'
import useLocalStorage from '../../hooks/useLocalStorage'

// Table-heavy pages use the full viewport width; card/chart pages are capped so
// content doesn't stretch absurdly on ultrawide or 1440p+ monitors.
const FULL_WIDTH_ROUTES = ['/claims', '/caseloads', '/hho-era-log', '/overhead']

export default function AppShell() {
  const { pathname } = useLocation()
  const fullWidth = FULL_WIDTH_ROUTES.some(r => pathname.startsWith(r))
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('clarity-sidebar-collapsed', false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <ToastProvider>
      {import.meta.env.MODE === 'demo' && (
        <div className="fixed bottom-3 right-3 z-[60] rounded-full bg-gold px-3 py-1 text-xs font-ui font-semibold text-ink shadow-lg pointer-events-none">
          Demo data — synthetic, not connected to live systems
        </div>
      )}
      <div className="min-h-screen bg-surface-sunken">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        />
        <div className={[
          'flex flex-col min-h-screen transition-[margin] duration-300 ease-in-out',
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-60',
        ].join(' ')}>
          <Topbar onMenuClick={() => setSidebarOpen(true)} onSearchClick={() => setPaletteOpen(true)} />
          <main className="flex-1 p-4 md:p-6">
            <div className={fullWidth ? 'w-full' : 'mx-auto w-full max-w-[1600px]'}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </ToastProvider>
  )
}
