import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-[210px]">
        <Topbar onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
