import { Menu, Search } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { ROLE_LABELS, ROLE_ICONS } from '../../types/auth.js'
import { NotificationBell } from './NotificationBell.jsx'

export function Topbar({ setMobileOpen }) {
  const { getUser } = useAuth()
  const user = getUser()

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-4 px-4 sm:px-6 flex-shrink-0">
      {/* Mobile menu toggle */}
      <button
        className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
        onClick={() => setMobileOpen(o => !o)}
      >
        <Menu size={20}/>
      </button>

      {/* Search */}
      <div className="flex-1 max-w-sm hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
        <Search size={15} className="text-slate-400 flex-shrink-0"/>
        <input
          type="text"
          placeholder="Search hospitals, doctors…"
          className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none font-body"
        />
      </div>

      <div className="flex-1 lg:hidden"/>

      <div className="flex items-center gap-2">
        {/* Real-time Notification Bell */}
        <NotificationBell/>

        {/* User pill */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
          <span className="text-base">{ROLE_ICONS[user?.role]}</span>
          <div className="hidden sm:block">
            <div className="text-xs font-semibold text-slate-700 leading-tight max-w-[120px] truncate">{user?.name}</div>
            <div className="text-xs text-slate-400 leading-tight">{ROLE_LABELS[user?.role]}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
