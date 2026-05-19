import { useState, useEffect } from 'react'
import {
  CalendarDays, CheckCircle2, Clock, PawPrint,
  Syringe, AlertTriangle, UserCheck, Loader2,
} from 'lucide-react'
import { roleDashApi } from '../../api/roleDashboard.js'
import { useAuth } from '../../hooks/useAuth.jsx'

const ANIMAL_EMOJIS = { COW:'🐄',BUFFALO:'🐃',GOAT:'🐐',DOG:'🐕',CAMEL:'🐪',HORSE:'🐎',SHEEP:'🐑',OTHER:'🐾' }

function StatCard({ icon:Icon, label, value, color='blue', alert }) {
  const colors = { blue:'text-blue-600 bg-blue-50', green:'text-green-600 bg-green-50', amber:'text-amber-600 bg-amber-50', red:'text-red-600 bg-red-50', purple:'text-purple-600 bg-purple-50' }
  return (
    <div className={`bg-white rounded-2xl border p-4 flex items-center gap-3 ${alert&&value>0?'border-red-200':'border-slate-200'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}><Icon size={18}/></div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-display font-bold ${alert&&value>0?'text-red-600':'text-slate-800'}`}>{value??0}</p>
      </div>
    </div>
  )
}

function fmt(d) { return d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—' }

export default function DoctorDashboard() {
  const { getUser } = useAuth()
  const user = getUser()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    roleDashApi.doctor()
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-slate-300"/></div>

  const { stats, todayQueue, recentDiseases } = data || {}
  const today = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* Greeting */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="text-4xl">👨‍⚕️</div>
          <div>
            <h1 className="font-display text-xl font-bold">Good {new Date().getHours()<12?'Morning':new Date().getHours()<17?'Afternoon':'Evening'}, Dr. {user?.name?.split(' ')[0]}!</h1>
            <p className="text-green-100 text-sm mt-0.5">{today}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={CalendarDays}  label="Today's Appointments" value={stats?.todayAppts}    color="blue"/>
        <StatCard icon={Clock}         label="Pending"              value={stats?.pendingAppts}   color="amber"/>
        <StatCard icon={CheckCircle2}  label="Completed"            value={stats?.completedAppts} color="green"/>
        <StatCard icon={PawPrint}      label="Animals Treated"      value={stats?.myAnimals}      color="purple"/>
        <StatCard icon={CalendarDays}  label="Total Appointments"   value={stats?.totalAppts}     color="blue"/>
        <StatCard icon={Syringe}       label="Vaccinations Due (30d)"value={stats?.upcomingVacc} color="amber" alert/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Today's Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <CalendarDays size={16} className="text-blue-500"/>
            <h3 className="font-semibold text-slate-800">Today's Queue ({stats?.todayAppts||0})</h3>
          </div>
          {!todayQueue?.length ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">No appointments today 🎉</div>
          ) : todayQueue.map(a => (
            <div key={a.id} className={`flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0 ${a.type==='EMERGENCY'?'bg-red-50/40':''}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${a.type==='EMERGENCY'?'bg-red-100 text-red-600':'bg-slate-100 text-slate-600'}`}>
                {a.type==='EMERGENCY'?'🚨':'#'+a.token_number}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  {ANIMAL_EMOJIS[a.animal?.animal_type]||'🐾'} {a.animal?.animal_type}{a.animal?.breed?' · '+a.animal.breed:''}
                </p>
                <p className="text-xs text-slate-400">{a.owner?.name} · {a.owner?.phone}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium
                ${a.status==='COMPLETED'?'bg-green-50 text-green-700 border-green-200':
                  a.status==='IN_PROGRESS'?'bg-blue-50 text-blue-700 border-blue-200':
                  'bg-amber-50 text-amber-700 border-amber-200'}`}>
                {a.status}
              </span>
            </div>
          ))}
        </div>

        {/* Recent Diagnoses */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400"/>
            <h3 className="font-semibold text-slate-800">Recent Diagnoses</h3>
          </div>
          {!recentDiseases?.length ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">No disease records yet</div>
          ) : recentDiseases.map(d => (
            <div key={d.id} className="flex items-start gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
              <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 mt-1.5"/>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{d.disease_name}</p>
                <p className="text-xs text-slate-400">
                  {ANIMAL_EMOJIS[d.animal?.animal_type]||'🐾'} {d.animal?.animal_type}{d.animal?.name?` "${d.animal.name}"`:''}
                  {' · '}{fmt(d.diagnosed_at)}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0
                ${d.status==='RESOLVED'?'bg-green-50 text-green-700 border-green-200':
                  d.status==='CHRONIC'?'bg-amber-50 text-amber-700 border-amber-200':
                  'bg-red-50 text-red-700 border-red-200'}`}>
                {d.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
