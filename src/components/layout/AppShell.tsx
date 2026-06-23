import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { ToastProvider } from '../../context/ToastContext'

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('clarity-sidebar-collapsed') === 'true' } catch { return false }
  })

  function toggleSidebarCollapse() {
    setSidebarCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('clarity-sidebar-collapsed', String(next)) } catch {}
      return next
    })
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface-sunken">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />
        <div className={[
          'flex flex-col min-h-screen transition-[margin] duration-300 ease-in-out',
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-60',
        ].join(' ')}>
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
