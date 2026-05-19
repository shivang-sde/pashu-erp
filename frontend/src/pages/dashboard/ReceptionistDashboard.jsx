import { useState, useEffect } from 'react'
import {
  CalendarDays, AlertTriangle, Clock,
  ReceiptText, PawPrint, CheckCircle2, Loader2,
} from 'lucide-react'
import { roleDashApi } from '../../api/roleDashboard.js'
import { useAuth } from '../../hooks/useAuth.jsx'

const ANIMAL_EMOJIS = { COW:'🐄',BUFFALO:'🐃',GOAT:'🐐',DOG:'🐕',CAMEL:'🐪',HORSE:'🐎',SHEEP:'🐑',OTHER:'🐾' }

function Stat({ icon:Icon, label, value, color='blue', alert }) {
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

export default function ReceptionistDashboard() {
  const { getUser } = useAuth()
  const user = getUser()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    roleDashApi.receptionist()
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-slate-300"/></div>

  const { stats, todayQueue, recentBills } = data || {}

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="text-4xl">📋</div>
          <div>
            <h1 className="font-display text-xl font-bold">Reception Dashboard</h1>
            <p className="text-teal-100 text-sm mt-0.5">{user?.name} · {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={CalendarDays}  label="Today Appts"    value={stats?.todayAppts}    color="blue"/>
        <Stat icon={AlertTriangle} label="Emergency"      value={stats?.emergencyAppts} color="red" alert/>
        <Stat icon={Clock}         label="Pending"        value={stats?.pendingAppts}   color="amber"/>
        <Stat icon={CheckCircle2}  label="Confirmed"      value={stats?.confirmedAppts} color="green"/>
        <Stat icon={ReceiptText}   label="Bills Today"    value={stats?.todayBills}     color="purple"/>
        <Stat icon={ReceiptText}   label="Pending Bills"  value={stats?.pendingBills}   color="amber" alert/>
        <Stat icon={PawPrint}      label="Total Animals"  value={stats?.totalAnimals}   color="blue"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Today's Queue — main focus for receptionist */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-blue-500"/>
              <h3 className="font-semibold text-slate-800">Today's Queue</h3>
            </div>
            {stats?.emergencyAppts > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                🚨 {stats.emergencyAppts} Emergency
              </span>
            )}
          </div>
          {!todayQueue?.length ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">No appointments today</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {todayQueue.map(a => (
                <div key={a.id} className={`flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0 ${a.type==='EMERGENCY'?'bg-red-50/40':''}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${a.type==='EMERGENCY'?'bg-red-100 text-red-600':'bg-slate-100 text-slate-600'}`}>
                    {a.type==='EMERGENCY'?'🚨':'#'+a.token_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {ANIMAL_EMOJIS[a.animal?.animal_type]||'🐾'} {a.animal?.animal_type}{a.animal?.breed?' · '+a.animal.breed:''}
                    </p>
                    <p className="text-xs text-slate-500">{a.owner?.name} · {a.owner?.phone}</p>
                    {a.owner?.village && <p className="text-xs text-slate-400">{a.owner.village}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium block
                      ${a.status==='COMPLETED'?'bg-green-50 text-green-700 border-green-200':
                        a.status==='IN_PROGRESS'?'bg-blue-50 text-blue-700 border-blue-200':
                        a.status==='CONFIRMED'?'bg-teal-50 text-teal-700 border-teal-200':
                        'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {a.status}
                    </span>
                    {a.doctor && <p className="text-xs text-slate-400 mt-1">Dr. {a.doctor.name}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Bills */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <ReceiptText size={16} className="text-purple-500"/>
            <h3 className="font-semibold text-slate-800">Recent Bills</h3>
            {stats?.pendingBills > 0 && (
              <span className="ml-auto text-xs text-amber-600 font-medium">{stats.pendingBills} pending</span>
            )}
          </div>
          {!recentBills?.length ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">No bills today</div>
          ) : recentBills.map(b => (
            <div key={b.id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
              <div className="flex-1 min-w-0">
                <code className="text-xs font-mono text-primary-600 font-semibold">{b.bill_number}</code>
                <p className="text-sm font-medium text-slate-800">{b.owner?.name}</p>
                <p className="text-xs text-slate-400">
                  {b.animal ? (ANIMAL_EMOJIS[b.animal.animal_type]||'🐾')+' '+b.animal.animal_type : ''} · {b.bill_type}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-slate-800">₹{parseFloat(b.total_amount).toFixed(0)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium
                  ${b.status==='PAID'?'bg-green-50 text-green-700 border-green-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {b.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
