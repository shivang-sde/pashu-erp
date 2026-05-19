import { useState, useEffect } from 'react'
import {
  Building2, Users, PawPrint, CalendarDays,
  ReceiptText, Pill, Package, AlertTriangle,
  TrendingUp, Clock, CheckCircle2, Loader2,
} from 'lucide-react'
import { roleDashApi } from '../../api/roleDashboard.js'
import { useAuth } from '../../hooks/useAuth.jsx'

const ANIMAL_EMOJIS = { COW:'🐄',BUFFALO:'🐃',GOAT:'🐐',DOG:'🐕',CAMEL:'🐪',HORSE:'🐎',SHEEP:'🐑',OTHER:'🐾' }

const ROLE_ICONS = { DOCTOR:'👨‍⚕️', PHARMACIST:'💊', RECEPTIONIST:'📋', HOSPITAL_ADMIN:'🏥' }

function Stat({ icon:Icon, label, value, color='blue', alert, prefix='' }) {
  const colors = { blue:'text-blue-600 bg-blue-50', green:'text-green-600 bg-green-50', amber:'text-amber-600 bg-amber-50', red:'text-red-600 bg-red-50', purple:'text-purple-600 bg-purple-50', teal:'text-teal-600 bg-teal-50' }
  return (
    <div className={`bg-white rounded-2xl border p-4 flex items-center gap-3 ${alert&&value>0?'border-red-200':'border-slate-200'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}><Icon size={18}/></div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-display font-bold ${alert&&value>0?'text-red-600':'text-slate-800'}`}>{prefix}{typeof value==='number'?value.toLocaleString('en-IN'):(value??0)}</p>
      </div>
    </div>
  )
}

export default function HospitalAdminDashboard() {
  const { getUser } = useAuth()
  const user = getUser()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    roleDashApi.hospitalAdmin()
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-slate-300"/></div>

  const { stats, staffByRole, todayQueue, recentBills } = data || {}

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="text-4xl">🏥</div>
          <div>
            <h1 className="font-display text-xl font-bold">Hospital Admin Dashboard</h1>
            <p className="text-blue-100 text-sm mt-0.5">{user?.name} · {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Stat icon={Users}       label="Total Staff"      value={stats?.totalStaff}   color="blue"/>
        <Stat icon={Building2}   label="Doctors"          value={stats?.totalDoctors} color="green"/>
        <Stat icon={PawPrint}    label="Animals"          value={stats?.totalAnimals} color="amber"/>
        <Stat icon={CalendarDays}label="Today Appts"      value={stats?.todayAppts}   color="teal"/>
        <Stat icon={ReceiptText} label="Today Bills"      value={stats?.todayBills}   color="purple"/>
        <Stat icon={TrendingUp}  label="Month Revenue"    value={stats?.monthRevenue} color="green" prefix="₹"/>
        <Stat icon={Pill}        label="Low Medicine Stock"value={stats?.lowMedStock}  color="red" alert/>
        <Stat icon={AlertTriangle}label="Expiring Meds"   value={stats?.expiringMed}  color="amber" alert/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Staff breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Users size={16} className="text-blue-500"/>
            <h3 className="font-semibold text-slate-800">Staff Breakdown</h3>
          </div>
          <div className="p-4 space-y-3">
            {staffByRole?.map(r => (
              <div key={r.role} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{ROLE_ICONS[r.role]||'👤'}</span>
                  <span className="text-sm text-slate-600">{r.role.replace('_',' ')}</span>
                </div>
                <span className="font-bold text-slate-800 text-sm">{r.count}</span>
              </div>
            ))}
            {!staffByRole?.length && <p className="text-sm text-slate-400 text-center py-4">No staff data</p>}
          </div>
        </div>

        {/* Today's queue */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <CalendarDays size={16} className="text-teal-500"/>
            <h3 className="font-semibold text-slate-800">Today's Appointments ({stats?.todayAppts||0})</h3>
            <span className="ml-auto text-xs text-amber-600 font-medium">{stats?.pendingAppts||0} pending</span>
          </div>
          {!todayQueue?.length ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">No appointments today</div>
          ) : todayQueue.map(a => (
            <div key={a.id} className={`flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0 ${a.type==='EMERGENCY'?'bg-red-50/40':''}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${a.type==='EMERGENCY'?'bg-red-100 text-red-600':'bg-slate-100 text-slate-600'}`}>
                {a.type==='EMERGENCY'?'🚨':'#'+a.token_number}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {ANIMAL_EMOJIS[a.animal?.animal_type]||'🐾'} {a.animal?.animal_type}{a.animal?.breed?' · '+a.animal.breed:''}
                </p>
                <p className="text-xs text-slate-400">{a.owner?.name} · {a.doctor?'Dr. '+a.doctor.name:'No doctor'}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0
                ${a.status==='COMPLETED'?'bg-green-50 text-green-700 border-green-200':
                  a.status==='IN_PROGRESS'?'bg-blue-50 text-blue-700 border-blue-200':
                  'bg-amber-50 text-amber-700 border-amber-200'}`}>
                {a.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Bills */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <ReceiptText size={16} className="text-purple-500"/>
          <h3 className="font-semibold text-slate-800">Today's Bills ({stats?.todayBills||0})</h3>
          <span className="ml-auto text-xs text-amber-600 font-medium">{stats?.pendingBills||0} pending</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              {['Bill No.','Owner','Amount','Status'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>)}
            </tr></thead>
            <tbody>
              {!recentBills?.length ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-400 text-sm">No bills today</td></tr>
              ) : recentBills.map(b => (
                <tr key={b.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-primary-600 font-semibold">{b.bill_number}</td>
                  <td className="px-4 py-3 text-slate-700">{b.owner?.name}<br/><span className="text-xs text-slate-400">{b.owner?.phone}</span></td>
                  <td className="px-4 py-3 font-bold text-slate-800">₹{parseFloat(b.total_amount).toFixed(2)}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border font-medium
                    ${b.status==='PAID'?'bg-green-50 text-green-700 border-green-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
