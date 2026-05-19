import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { ROLES, ROLE_LABELS, ROLE_ICONS, ROLE_COLORS } from '../../types/auth.js'

export function RoleSelector({ value, onChange, error }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  return (
    <div className="flex flex-col gap-1.5" ref={ref}>
      <label className="text-sm font-medium text-slate-700 font-body">Login as <span className="text-red-500">*</span></label>
      <div className="relative">
        <button type="button" onClick={() => setOpen(o=>!o)}
          className={['w-full flex items-center justify-between px-4 py-2.5 rounded-xl border bg-white text-sm font-body transition-all duration-200 outline-none', open?'border-primary-600 ring-2 ring-primary-600/20':error?'border-red-400':'border-slate-200 hover:border-slate-300'].join(' ')}>
          {value ? (
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-base flex-shrink-0">{ROLE_ICONS[value]}</span>
              <span className="text-slate-800 truncate">{ROLE_LABELS[value]}</span>
              <Badge role={value}/>
            </span>
          ) : <span className="text-slate-400">Select your role…</span>}
          <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 ml-2 transition-transform ${open?'rotate-180':''}`}/>
        </button>

        {open && (
          <ul className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-white border border-slate-200 rounded-xl shadow-card-hover overflow-hidden animate-fade-up">
            {Object.values(ROLES).map(role => (
              <li key={role}>
                <button type="button" onClick={() => { onChange(role); setOpen(false) }}
                  className={['w-full flex items-center gap-3 px-4 py-2.5 text-sm font-body text-left transition-colors hover:bg-slate-50', value===role?'bg-primary-50':''].join(' ')}>
                  <span className="text-base flex-shrink-0">{ROLE_ICONS[role]}</span>
                  <span className="flex-1 text-slate-700 font-medium">{ROLE_LABELS[role]}</span>
                  <Badge role={role}/>
                  {value===role && <Check size={14} className="text-primary-600 flex-shrink-0"/>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-xs text-red-500 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0"/>{error}</p>}
    </div>
  )
}

function Badge({ role }) {
  const c = ROLE_COLORS[role]
  if (!c) return null
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0" style={{color:c.text,background:c.bg,borderColor:c.border}}>{role.replace('_',' ')}</span>
}
