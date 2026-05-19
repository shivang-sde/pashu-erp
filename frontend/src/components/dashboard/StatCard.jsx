import { Loader2 } from 'lucide-react'

export function StatCard({ label, value, icon: Icon, color = 'blue', sub, loading }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   icon: 'bg-blue-100' },
    green:  { bg: 'bg-green-50',  text: 'text-green-600',  icon: 'bg-green-100' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  icon: 'bg-amber-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'bg-purple-100' },
    red:    { bg: 'bg-red-50',    text: 'text-red-600',    icon: 'bg-red-100' },
    teal:   { bg: 'bg-teal-50',   text: 'text-teal-600',   icon: 'bg-teal-100' },
  }
  const c = colors[color] || colors.blue

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4 shadow-card hover:shadow-card-hover transition-shadow duration-200">
      <div className={`${c.icon} rounded-xl p-2.5 flex-shrink-0`}>
        <Icon size={20} className={c.text}/>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        {loading ? (
          <Loader2 size={18} className="animate-spin text-slate-300 mt-1"/>
        ) : (
          <p className="text-2xl font-display font-bold text-slate-800 mt-0.5">{value ?? 0}</p>
        )}
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
