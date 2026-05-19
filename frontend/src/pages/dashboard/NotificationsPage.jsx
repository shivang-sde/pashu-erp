import { useState, useEffect } from 'react'
import {
  Bell, RefreshCw, X, CheckCheck,
  AlertTriangle, Info, Pill, Package,
  CalendarDays, ReceiptText, Syringe,
} from 'lucide-react'
import { notifApi } from '../../api/notifications.js'
import { useAuth } from '../../hooks/useAuth.jsx'

const SEVERITY_CONFIG = {
  critical: {
    label:   'Critical',
    bg:      'bg-red-50 border-red-200',
    badge:   'bg-red-100 text-red-700 border-red-200',
    dot:     'bg-red-500',
    iconBg:  'bg-red-100',
    text:    'text-red-700',
    pulse:   true,
  },
  warning: {
    label:   'Warning',
    bg:      'bg-amber-50 border-amber-200',
    badge:   'bg-amber-100 text-amber-700 border-amber-200',
    dot:     'bg-amber-400',
    iconBg:  'bg-amber-100',
    text:    'text-amber-700',
    pulse:   false,
  },
  info: {
    label:   'Info',
    bg:      'bg-blue-50 border-blue-200',
    badge:   'bg-blue-100 text-blue-700 border-blue-200',
    dot:     'bg-blue-400',
    iconBg:  'bg-blue-100',
    text:    'text-blue-700',
    pulse:   false,
  },
}

const TYPE_CONFIG = {
  LOW_STOCK:             { label:'Low Medicine Stock',    icon: Pill },
  EXPIRING_MEDICINE:     { label:'Expiring Medicine',     icon: AlertTriangle },
  LOW_INVENTORY:         { label:'Low Inventory',         icon: Package },
  OVERDUE_VACCINATION:   { label:'Overdue Vaccination',   icon: Syringe },
  VACCINATION_DUE:       { label:'Vaccination Due',       icon: Syringe },
  PENDING_APPOINTMENTS:  { label:'Pending Appointments',  icon: CalendarDays },
  EMERGENCY_APPOINTMENT: { label:'Emergency Appointment', icon: AlertTriangle },
  PENDING_BILLS:         { label:'Pending Bills',         icon: ReceiptText },
}

// Role-based type visibility
const ROLE_TYPES = {
  STATE_ADMIN:    null, // all
  DISTRICT_ADMIN: null,
  HOSPITAL_ADMIN: null,
  DOCTOR:         ['PENDING_APPOINTMENTS','EMERGENCY_APPOINTMENT','OVERDUE_VACCINATION','VACCINATION_DUE'],
  PHARMACIST:     ['LOW_STOCK','EXPIRING_MEDICINE','LOW_INVENTORY'],
  RECEPTIONIST:   ['PENDING_APPOINTMENTS','EMERGENCY_APPOINTMENT','PENDING_BILLS'],
}

function NotifCard({ notif, onDismiss }) {
  const sev  = SEVERITY_CONFIG[notif.severity] || SEVERITY_CONFIG.info
  const type = TYPE_CONFIG[notif.type]
  const Icon = type?.icon || Bell

  return (
    <div className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${sev.bg}`}>
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${sev.iconBg}`}>
        {notif.icon || '🔔'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${sev.badge}`}>
              {notif.severity.toUpperCase()}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {type?.label || notif.type}
            </span>
          </div>
          <button onClick={() => onDismiss(notif.id)}
            className="text-slate-300 hover:text-slate-500 flex-shrink-0 transition-colors">
            <X size={14}/>
          </button>
        </div>

        <h4 className={`font-semibold text-sm mt-1.5 ${sev.text}`}>{notif.title}</h4>
        <p className="text-sm text-slate-600 mt-0.5">{notif.message}</p>

        {notif.link && (
          <a href={notif.link}
            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium mt-2 transition-colors">
            View details →
          </a>
        )}
      </div>

      {/* Severity dot */}
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${sev.dot} ${sev.pulse ? 'animate-pulse' : ''}`}/>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function NotificationsPage() {
  const { getUser } = useAuth()
  const user = getUser()

  const [notifications, setNotifications] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [filter,        setFilter]        = useState('all') // 'all' | 'critical' | 'warning' | 'info'
  const [typeFilter,    setTypeFilter]    = useState('all')
  const [dismissed,     setDismissed]     = useState(new Set())

  const allowedTypes = ROLE_TYPES[user?.role] || null

  async function load() {
    setLoading(true)
    try {
      const r = await notifApi.list()
      setNotifications(r.data.data || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function dismiss(id) { setDismissed(p => new Set([...p, id])) }
  function dismissAll() { setDismissed(new Set(notifications.map(n => n.id))) }

  // Filtered list
  const visible = notifications.filter(n => {
    if (dismissed.has(n.id)) return false
    if (allowedTypes && !allowedTypes.includes(n.type)) return false
    if (filter !== 'all' && n.severity !== filter) return false
    if (typeFilter !== 'all' && n.type !== typeFilter) return false
    return true
  })

  const critCount = visible.filter(n => n.severity === 'critical').length
  const warnCount = visible.filter(n => n.severity === 'warning').length
  const infoCount = visible.filter(n => n.severity === 'info').length

  // Available types for this role
  const availableTypes = allowedTypes
    ? allowedTypes.map(t => ({ value: t, label: TYPE_CONFIG[t]?.label || t }))
    : Object.entries(TYPE_CONFIG).map(([k,v]) => ({ value:k, label:v.label }))

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            {visible.length} active alert{visible.length !== 1 ? 's' : ''}
            {dismissed.size > 0 && ` · ${dismissed.size} dismissed`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {visible.length > 0 && (
            <button onClick={dismissAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              <CheckCheck size={15}/> Dismiss All
            </button>
          )}
          <button onClick={load}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setFilter(filter === 'critical' ? 'all' : 'critical')}
          className={`rounded-2xl border p-4 text-left transition-all ${filter==='critical' ? 'bg-red-50 border-red-300 ring-2 ring-red-200' : 'bg-white border-slate-200 hover:border-red-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"/>
            <span className="text-xs font-semibold text-red-700">Critical</span>
          </div>
          <div className="text-2xl font-display font-bold text-red-700">{critCount}</div>
          <div className="text-xs text-slate-400 mt-0.5">Needs immediate action</div>
        </button>

        <button onClick={() => setFilter(filter === 'warning' ? 'all' : 'warning')}
          className={`rounded-2xl border p-4 text-left transition-all ${filter==='warning' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' : 'bg-white border-slate-200 hover:border-amber-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400"/>
            <span className="text-xs font-semibold text-amber-700">Warning</span>
          </div>
          <div className="text-2xl font-display font-bold text-amber-700">{warnCount}</div>
          <div className="text-xs text-slate-400 mt-0.5">Attention recommended</div>
        </button>

        <button onClick={() => setFilter(filter === 'info' ? 'all' : 'info')}
          className={`rounded-2xl border p-4 text-left transition-all ${filter==='info' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-white border-slate-200 hover:border-blue-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400"/>
            <span className="text-xs font-semibold text-blue-700">Info</span>
          </div>
          <div className="text-2xl font-display font-bold text-blue-700">{infoCount}</div>
          <div className="text-xs text-slate-400 mt-0.5">For your awareness</div>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
          <Bell size={14}/> Filter by type:
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="input-base h-9 text-sm w-52">
          <option value="all">All types</option>
          {availableTypes.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {(filter !== 'all' || typeFilter !== 'all') && (
          <button onClick={() => { setFilter('all'); setTypeFilter('all') }}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
            <X size={12}/> Clear filters
          </button>
        )}
        <div className="ml-auto text-xs text-slate-400">
          Role: <span className="font-semibold text-slate-600">{user?.role?.replace(/_/g,' ')}</span>
          {allowedTypes && <span className="ml-1 text-slate-300">· {allowedTypes.length} alert types</span>}
        </div>
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({length:4}).map((_,i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse flex-shrink-0"/>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded animate-pulse w-32"/>
                <div className="h-3 bg-slate-100 rounded animate-pulse w-full"/>
                <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4"/>
              </div>
            </div>
          ))}
        </div>
      ) : !visible.length ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCheck size={28} className="text-green-500"/>
          </div>
          <h3 className="font-display text-lg font-bold text-slate-800">
            {dismissed.size > 0 ? 'All notifications dismissed!' : 'All clear!'}
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            {filter !== 'all' || typeFilter !== 'all'
              ? 'No alerts match the current filter.'
              : 'No active alerts for your role right now.'}
          </p>
          {dismissed.size > 0 && (
            <button onClick={() => setDismissed(new Set())}
              className="mt-4 text-sm text-primary-600 hover:text-primary-800 font-medium transition-colors">
              Restore {dismissed.size} dismissed alert{dismissed.size>1?'s':''}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Critical first, then warning, then info */}
          {['critical','warning','info'].map(sev => {
            const group = visible.filter(n => n.severity === sev)
            if (!group.length) return null
            return (
              <div key={sev}>
                <div className="flex items-center gap-2 mb-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${SEVERITY_CONFIG[sev].dot} ${sev==='critical'?'animate-pulse':''}`}/>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    {SEVERITY_CONFIG[sev].label} ({group.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {group.map(n => (
                    <NotifCard key={n.id} notif={n} onDismiss={dismiss}/>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
