import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar.jsx'
import { Topbar }  from './Topbar.jsx'

export function DashboardLayout() {
  const [collapsed,   setCollapsed]   = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)

  return (
    <div className="flex h-screen bg-pashu-bg overflow-hidden font-body">
      <Sidebar
        collapsed={collapsed}   setCollapsed={setCollapsed}
        mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar setMobileOpen={setMobileOpen}/>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet/>
        </main>
      </div>
    </div>
  )
}
