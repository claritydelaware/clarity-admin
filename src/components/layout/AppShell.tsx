import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { ToastProvider } from '../../context/ToastContext'

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ToastProvider>
      <div className="min-h-screen bg-cream">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-col min-h-screen md:ml-60">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
