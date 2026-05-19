import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Stethoscope, PawPrint,
  CalendarDays, Pill, Package, ReceiptText, BarChart3,
  ChevronLeft, ChevronRight, LogOut, Settings, Menu, X,
  Users, FileUp, Printer, Bell, Mail,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { ROLE_LABELS, ROLE_ICONS } from '../../types/auth.js'

const NAV = [
  { label: 'Dashboard',    path: '/dashboard/state',    icon: LayoutDashboard, roles: ['STATE_ADMIN','DISTRICT_ADMIN'] },
  { label: 'Hospitals',    path: '/dashboard/hospitals',icon: Building2,       roles: ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN'] },
  { label: 'Doctors',      path: '/dashboard/doctors',  icon: Stethoscope,     roles: ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN'] },
  { label: 'Patients',     path: '/dashboard/patients', icon: PawPrint,        roles: ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','RECEPTIONIST'] },
  { label: 'Appointments', path: '/dashboard/appointments',icon: CalendarDays, roles: ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','RECEPTIONIST'] },
  { label: 'Pharmacy',     path: '/dashboard/pharmacy', icon: Pill,            roles: ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','PHARMACIST'] },
  { label: 'Inventory',    path: '/dashboard/inventory',icon: Package,         roles: ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','PHARMACIST'] },
  { label: 'Billing',      path: '/dashboard/billing',  icon: ReceiptText,     roles: ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','RECEPTIONIST'] },
  { label: 'Reports',      path: '/dashboard/reports',  icon: BarChart3,       roles: ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN'] },
  { label: 'Users',        path: '/dashboard/users',       icon: Users,    roles: ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN'] },
  { label: 'Bulk Import',  path: '/dashboard/bulk',        icon: FileUp,   roles: ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN'] },
  { label: 'Print Center', path: '/dashboard/print',       icon: Printer,  roles: ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','RECEPTIONIST','PHARMACIST'] },
  { label: 'Notifications', path: '/dashboard/notifications',  icon: Bell,          roles: ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','PHARMACIST','RECEPTIONIST'] },
  { label: 'Prescriptions',  path: '/dashboard/prescriptions',  icon: Stethoscope, roles: ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','RECEPTIONIST'] },
]

function PashuLogo({ collapsed }) {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none" className="flex-shrink-0">
        <rect width="40" height="40" rx="10" fill="#1d4ed8"/>
        <path d="M10 28C10 22 14 17 20 17C26 17 30 22 30 28" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        <circle cx="20" cy="13" r="4" fill="white" opacity="0.9"/>
        <path d="M14 17C12 15 9 14 8 16" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
        <path d="M26 17C28 15 31 14 32 16" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      </svg>
      {!collapsed && (
        <div className="min-w-0">
          <div className="font-display text-base font-bold text-slate-800 leading-tight">PashuCare</div>
          <div className="text-xs text-slate-400 font-body">ERP Platform</div>
        </div>
      )}
    </div>
  )
}

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { getUser, logout } = useAuth()
  const user = getUser()

  const visibleNav = NAV.filter(n => !n.roles || n.roles.includes(user?.role))

  const linkClass = ({ isActive }) => [
    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium font-body transition-all duration-150',
    'group relative',
    isActive
      ? 'bg-primary-50 text-primary-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
  ].join(' ')

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
        <PashuLogo collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(c => !c)}
          className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight size={15}/> : <ChevronLeft size={15}/>}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleNav.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={linkClass}
            onClick={() => setMobileOpen(false)}
          >
            <item.icon size={18} className="flex-shrink-0"/>
            {!collapsed && <span className="truncate">{item.label}</span>}
            {collapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg
                              opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                {item.label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-slate-100 space-y-1">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-sm">
              {ROLE_ICONS[user?.role]}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-700 truncate">{user?.name}</div>
              <div className="text-xs text-slate-400 truncate">{ROLE_LABELS[user?.role]}</div>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium font-body
                     text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} className="flex-shrink-0"/>
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={[
        'hidden lg:flex flex-col bg-white border-r border-slate-200 h-screen sticky top-0 transition-all duration-300 flex-shrink-0',
        collapsed ? 'w-[68px]' : 'w-[240px]',
      ].join(' ')}>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMobileOpen(false)}/>
          <aside className="relative z-50 flex flex-col w-[240px] bg-white h-full shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
