import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X, CheckCheck, Wifi, WifiOff } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications.js'

const SEVERITY_STYLES = {
  critical: {
    bg:     'bg-red-50 border-red-200 hover:bg-red-100',
    dot:    'bg-red-500',
    badge:  'bg-red-500',
    icon_bg:'bg-red-100',
    text:   'text-red-700',
  },
  warning: {
    bg:     'bg-amber-50 border-amber-200 hover:bg-amber-100',
    dot:    'bg-amber-400',
    badge:  'bg-amber-500',
    icon_bg:'bg-amber-100',
    text:   'text-amber-700',
  },
  info: {
    bg:     'bg-blue-50 border-blue-200 hover:bg-blue-100',
    dot:    'bg-blue-400',
    badge:  'bg-blue-500',
    icon_bg:'bg-blue-100',
    text:   'text-blue-700',
  },
}

export function NotificationBell() {
  const { notifications, count, connected, dismiss, dismissAll } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref  = useRef(null)
  const navigate = useNavigate()

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleClick(notif) {
    dismiss(notif.id)
    setOpen(false)
    if (notif.link) navigate(notif.link)
  }

  const criticalCount = notifications.filter(n => n.severity === 'critical').length

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
        title="Notifications"
      >
        <Bell size={18}/>

        {/* Badge */}
        {count > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-white text-[10px] font-bold px-1 ${criticalCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-80 max-h-[480px] bg-white rounded-2xl border border-slate-200 shadow-xl z-50 flex flex-col animate-fade-up overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-bold text-slate-800">Notifications</h3>
              {count > 0 && (
                <span className="bg-primary-100 text-primary-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{count}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Connection status */}
              <span title={connected ? 'Live' : 'Reconnecting…'}>
                {connected
                  ? <Wifi size={13} className="text-green-500"/>
                  : <WifiOff size={13} className="text-slate-300 animate-pulse"/>}
              </span>
              {count > 0 && (
                <button onClick={dismissAll}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary-600 transition-colors font-medium">
                  <CheckCheck size={13}/> Clear all
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto">
            {!notifications.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Bell size={28} className="mb-2 text-slate-300"/>
                <p className="text-sm font-medium">All clear!</p>
                <p className="text-xs mt-0.5">No alerts right now</p>
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {notifications.map(n => {
                  const s = SEVERITY_STYLES[n.severity] || SEVERITY_STYLES.info
                  return (
                    <div key={n.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${s.bg}`}
                      onClick={() => handleClick(n)}>
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base ${s.icon_bg}`}>
                        {n.icon}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-xs font-bold ${s.text}`}>{n.title}</p>
                          <button
                            onClick={e => { e.stopPropagation(); dismiss(n.id) }}
                            className="text-slate-300 hover:text-slate-500 flex-shrink-0 transition-colors mt-0.5">
                            <X size={12}/>
                          </button>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                        {n.link && (
                          <p className="text-xs text-primary-600 mt-1 font-medium">Tap to view →</p>
                        )}
                      </div>
                      {/* Severity dot */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${s.dot} ${n.severity==='critical'?'animate-pulse':''}`}/>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100 flex-shrink-0 bg-slate-50">
            <p className="text-xs text-slate-400 text-center">
              {connected ? '🟢 Live — updates every 2 minutes' : '🔴 Reconnecting…'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
