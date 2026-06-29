import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { ToastProvider } from '../../context/ToastContext'
import useLocalStorage from '../../hooks/useLocalStorage'

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('clarity-sidebar-collapsed', false)

  return (
    <ToastProvider>
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
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
