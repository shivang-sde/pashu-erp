import { useEffect, useState, useRef } from 'react'
import {
  Building2, Users, Stethoscope, MapPin,
  RefreshCw, CheckCircle2, AlertCircle, Clock,
  PawPrint, Pill, CalendarDays, TrendingUp,
} from 'lucide-react'
import { dashboardApi } from '../../api/dashboard.js'
import { useAuth }      from '../../hooks/useAuth.jsx'
import { StatCard } from '../../components/dashboard/StatCard.jsx'

// ── small helpers ────────────────────────────────────────────
function Badge({ children, color = 'green' }) {
  const map = {
    green:  'bg-green-50 text-green-700 border-green-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    amber:  'bg-amber-50 text-amber-700 border-amber-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    gray:   'bg-slate-100 text-slate-600 border-slate-200',
  }
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${map[color]||map.gray}`}>
      {children}
    </span>
  )
}

function SectionTitle({ children, sub }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-lg font-bold text-slate-800">{children}</h2>
      {sub && <p className="text-sm text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Role chart (pure CSS bar chart — no external lib needed) ─
function RoleChart({ data, loading }) {
  if (loading) return <div className="h-40 flex items-center justify-center"><RefreshCw size={20} className="animate-spin text-slate-300"/></div>
  if (!data?.length) return <p className="text-sm text-slate-400 text-center py-8">No data</p>

  const LABELS = { STATE_ADMIN:'State Admin', DISTRICT_ADMIN:'District Admin', HOSPITAL_ADMIN:'Hospital Admin', DOCTOR:'Doctor', PHARMACIST:'Pharmacist', RECEPTIONIST:'Receptionist' }
  const COLORS = { STATE_ADMIN:'bg-blue-500', DISTRICT_ADMIN:'bg-indigo-500', HOSPITAL_ADMIN:'bg-teal-500', DOCTOR:'bg-green-500', PHARMACIST:'bg-amber-500', RECEPTIONIST:'bg-purple-500' }
  const max = Math.max(...data.map(d => parseInt(d.count)))
  const total = data.reduce((s, d) => s + parseInt(d.count), 0)

  return (
    <div className="space-y-3">
      {data.map(d => {
        const count = parseInt(d.count)
        const pct   = max > 0 ? (count / max) * 100 : 0
        return (
          <div key={d.role} className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-28 flex-shrink-0 truncate">{LABELS[d.role] || d.role}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${COLORS[d.role] || 'bg-slate-400'}`} style={{ width: `${pct}%` }}/>
            </div>
            <span className="text-xs font-semibold text-slate-700 w-6 text-right">{count}</span>
          </div>
        )
      })}
      <p className="text-xs text-slate-400 pt-1">Total active users: {total}</p>
    </div>
  )
}

// ── District summary table ────────────────────────────────────
function DistrictChart({ data, loading, byState, states, selectedState, onStateChange }) {
  if (loading) return <div className="h-40 flex items-center justify-center"><RefreshCw size={20} className="animate-spin text-slate-300"/></div>

  const maxH = data?.length ? Math.max(...data.map(d => d.hospitals), 1) : 1

  return (
    <div className="space-y-4">
      {/* State filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={selectedState} onChange={e => onStateChange(e.target.value)}
          className="input-base h-8 text-xs w-48">
          <option value="">All States</option>
          {states?.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {selectedState && (
          <button onClick={() => onStateChange('')}
            className="text-xs text-red-500 hover:text-red-700 font-medium">× Clear</button>
        )}
        <span className="text-xs text-slate-400 ml-auto">{data?.length || 0} districts</span>
      </div>

      {/* State-level summary when no filter */}
      {!selectedState && byState?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              {['State','Districts','Hospitals','Doctors'].map(h => (
                <th key={h} className="text-left px-3 py-2 font-semibold text-slate-500">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {byState.map(s => (
                <tr key={s.state} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                  onClick={() => onStateChange(s.state)}>
                  <td className="px-3 py-2 font-medium text-primary-700">{s.state}</td>
                  <td className="px-3 py-2">{s.districts}</td>
                  <td className="px-3 py-2 font-bold text-slate-800">{s.hospitals}</td>
                  <td className="px-3 py-2">{s.doctors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* District-level detail when state selected */}
      {selectedState && (
        <>
          {!data?.length ? (
            <p className="text-sm text-slate-400 text-center py-6">No districts with hospitals in {selectedState}</p>
          ) : (
            <>
              {/* Bar chart */}
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1 h-28 min-w-max px-1">
                  {data.map(d => (
                    <div key={d.id} className="flex flex-col items-center gap-1 w-14">
                      <span className="text-xs font-bold text-slate-700">{d.hospitals}</span>
                      <div className="w-10 bg-primary-500 rounded-t transition-all duration-500 min-h-[4px]"
                        style={{ height:`${(d.hospitals/maxH)*88}px` }}/>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 min-w-max px-1 mt-1">
                  {data.map(d => (
                    <div key={d.id} className="w-14 text-center">
                      <span className="text-[10px] text-slate-400 block leading-tight"
                        style={{wordBreak:'break-word',maxWidth:'56px',display:'inline-block',textAlign:'center'}}>
                        {d.name.length > 10 ? d.name.slice(0,10)+'…' : d.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* District table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50 border-b border-slate-200">
                    {['District','Code','Hospitals','Doctors'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-slate-500">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.map(d => (
                      <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800">{d.name}</td>
                        <td className="px-3 py-2 text-slate-400">{d.code}</td>
                        <td className="px-3 py-2 font-bold text-primary-700">{d.hospitals}</td>
                        <td className="px-3 py-2">{d.doctors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── Activity feed ────────────────────────────────────────────
function ActivityFeed({ data, loading }) {
  if (loading) return <div className="h-40 flex items-center justify-center"><RefreshCw size={20} className="animate-spin text-slate-300"/></div>
  if (!data?.length) return <p className="text-sm text-slate-400 text-center py-8">No recent activity</p>

  const actionIcon = (action) => {
    if (action === 'LOGIN')  return <CheckCircle2 size={14} className="text-green-500"/>
    if (action === 'LOGOUT') return <AlertCircle  size={14} className="text-slate-400"/>
    return <Clock size={14} className="text-blue-500"/>
  }

  return (
    <div className="space-y-3">
      {data.map(log => (
        <div key={log.id} className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
            {actionIcon(log.action)}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-700">
              <span className="font-medium">{log.user?.name || 'System'}</span>
              {' '}<span className="text-slate-500">{log.action.toLowerCase().replace('_', ' ')}</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Hospital table ────────────────────────────────────────────
function HospitalTable({ data, loading, search, setSearch, onRefresh }) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <SectionTitle sub={`${data?.pagination?.total || 0} hospitals registered`}>
          All Hospitals
        </SectionTitle>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search hospitals…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-base h-9 text-sm w-48"
          />
          <button onClick={onRefresh} className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors">
            <RefreshCw size={15} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`}/>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Hospital', 'Code', 'District', 'Type', 'Staff', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">
                  <RefreshCw size={20} className="animate-spin mx-auto mb-2"/>Loading hospitals…
                </td></tr>
              ) : !data?.hospitals?.length ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">No hospitals found</td></tr>
              ) : data.hospitals.map(h => (
                <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{h.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{h.address?.slice(0, 40)}{h.address?.length > 40 ? '…' : ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{h.code}</code>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{h.district?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge color={h.type === 'GOVERNMENT' ? 'blue' : 'amber'}>
                      {h.type === 'GOVERNMENT' ? 'Govt' : 'Private'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{h.staffCount}</td>
                  <td className="px-4 py-3">
                    <Badge color={h.status === 'ACTIVE' ? 'green' : 'red'}>
                      {h.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination?.pages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <span>Page {data.pagination.page} of {data.pagination.pages}</span>
            <span>{data.pagination.total} total</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// STATE ADMIN DASHBOARD — main page
// ════════════════════════════════════════════════════════════
export default function StateAdminDashboard() {
  const { getUser } = useAuth()
  const user = getUser()
  const [stats,    setStats]    = useState(null)
  const [roles,    setRoles]    = useState([])
  const [districts,setDistricts]= useState([])
  const [byState,   setByState]   = useState([])
  const [distStates,setDistStates]= useState([])
  const [selState,  setSelState]  = useState(user?.state || '')
  const [activity, setActivity] = useState([])
  const [hospitals,setHospitals]= useState(null)
  const [search,   setSearch]   = useState('')

  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingCharts,setLoadingCharts]= useState(true)
  const [loadingH,     setLoadingH]     = useState(true)

  const searchTimer = useRef(null)

  // Load KPIs + charts
  useEffect(() => {
    async function load() {
      try {
        const [s, r, d, a] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getUserRoles(),
          dashboardApi.getDistrictSummary(),
          dashboardApi.getRecentActivity(),
        ])
        setStats(s.data.data)
        setRoles(r.data.data)
        setDistricts(d.data.data)
        setByState(d.data.byState||[])
        setDistStates(d.data.states||[])
        setActivity(a.data.data)
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoadingStats(false)
        setLoadingCharts(false)
      }
    }
    load()
  }, [])

  // Load hospitals (debounced search)
  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => fetchHospitals(), 350)
    return () => clearTimeout(searchTimer.current)
  }, [search])

  async function fetchHospitals() {
    setLoadingH(true)
    try {
      const res = await dashboardApi.getHospitals({ search, limit: 10 })
      setHospitals(res.data.data)
    } catch (err) {
      console.error('Hospitals load error:', err)
    } finally {
      setLoadingH(false)
    }
  }

  const today = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">State Admin Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">{today}</p>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Hospitals"  value={stats?.totalHospitals}  icon={Building2}    color="blue"   sub={`${stats?.activeHospitals || 0} active`} loading={loadingStats}/>
        <StatCard label="Active Doctors"   value={stats?.totalDoctors}    icon={Stethoscope}  color="green"  sub="Registered doctors"     loading={loadingStats}/>
        <StatCard label="Total Users"      value={stats?.totalUsers}      icon={Users}        color="purple" sub="All roles combined"      loading={loadingStats}/>
        <StatCard label="Districts"        value={stats?.totalDistricts}  icon={MapPin}       color="amber"  sub="Covered districts"       loading={loadingStats}/>
        <StatCard label="Animal Patients"  value={stats?.totalPatients}   icon={PawPrint}     color="teal"   sub="Registered animals"      loading={loadingStats}/>
        <StatCard label="Medicines"        value={stats?.totalMedicines}  icon={Pill}         color="red"    sub="In inventory"            loading={loadingStats}/>
        <StatCard label="Appointments"     value={stats?.pendingAppointments} icon={CalendarDays} color="blue" sub="Pending today"        loading={loadingStats}/>
        <StatCard label="Active Hospitals" value={stats?.activeHospitals} icon={TrendingUp}   color="green"  sub="Operational"             loading={loadingStats}/>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* User roles chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <SectionTitle sub="Active users by role">User Roles</SectionTitle>
          <RoleChart data={roles} loading={loadingCharts}/>
        </div>

        {/* District summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <SectionTitle sub="Hospitals per district">District Summary</SectionTitle>
          <DistrictChart
            data={districts}
            loading={loadingCharts}
            byState={byState}
            states={distStates}
            selectedState={selState}
            onStateChange={async (s) => {
              setSelState(s)
              setLoadingCharts(true)
              try {
                const r = await dashboardApi.getDistrictSummary(s ? `?state=${encodeURIComponent(s)}` : '')
                setDistricts(r.data.data)
                setByState(r.data.byState||[])
              } catch {}
              finally { setLoadingCharts(false) }
            }}
          />
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <SectionTitle sub="Last 10 system events">Recent Activity</SectionTitle>
          <ActivityFeed data={activity} loading={loadingCharts}/>
        </div>
      </div>

      {/* ── Hospital table ── */}
      <HospitalTable
        data={hospitals}
        loading={loadingH}
        search={search}
        setSearch={setSearch}
        onRefresh={fetchHospitals}
      />

    </div>
  )
}
