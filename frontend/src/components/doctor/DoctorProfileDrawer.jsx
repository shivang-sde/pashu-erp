import { useState, useEffect } from 'react'
import {
  X, Stethoscope, Printer, Loader2,
  CalendarDays, PawPrint, Building2,
  CheckCircle2, Clock, AlertTriangle,
  Activity, Hash, TrendingUp, LogIn,
} from 'lucide-react'
import { doctorApi } from '../../api/doctors.js'

const ANIMAL_EMOJIS = { COW:'🐄',BUFFALO:'🐃',GOAT:'🐐',DOG:'🐕',CAMEL:'🐪',HORSE:'🐎',SHEEP:'🐑',OTHER:'🐾' }
const MONTH_NAMES   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(d)  { return d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—' }
function fmtDT(d){ return d ? new Date(d).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—' }

function StatBox({ label, value, color='blue', sub }) {
  const c = { blue:'bg-blue-50 text-blue-700', green:'bg-green-50 text-green-700', amber:'bg-amber-50 text-amber-700', red:'bg-red-50 text-red-700', purple:'bg-purple-50 text-purple-700', teal:'bg-teal-50 text-teal-700' }
  return (
    <div className={`rounded-xl p-3 text-center ${c[color]||c.blue}`}>
      <div className="text-xl font-display font-bold">{value??0}</div>
      <div className="text-xs font-medium mt-0.5 opacity-80">{label}</div>
      {sub && <div className="text-xs opacity-60 mt-0.5">{sub}</div>}
    </div>
  )
}

const TABS = [
  { id:'overview',     label:'Overview' },
  { id:'visits',       label:'Visits' },
  { id:'hospitals',    label:'Hospitals' },
  { id:'diseases',     label:'Diseases' },
  { id:'performance',  label:'Performance' },
  { id:'activity',     label:'Activity Log' },
]

// ── Print function ────────────────────────────────────────────
function printDoctorProfile(data) {
  if (!data) return
  const { doctor, stats, hospitalVisits, diseaseStats, animalTypeStats, recentAppts, monthlyPerformance } = data
  const specs = Array.isArray(doctor.specializations) ? doctor.specializations.join(', ') : (doctor.specializations || '—')
  const today = new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})

  const html = `<!DOCTYPE html><html><head>
  <title>Doctor Profile — ${doctor.name}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;padding:20px}
    .header{border-bottom:3px solid #15803d;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-start}
    .name{font-size:20px;font-weight:bold;color:#15803d}
    .sub{color:#64748b;font-size:11px;margin-top:3px}
    .print-date{font-size:10px;color:#94a3b8;text-align:right}
    .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
    .stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center}
    .stat-val{font-size:18px;font-weight:bold;color:#15803d}
    .stat-lbl{font-size:10px;color:#64748b;margin-top:2px}
    .section{margin-bottom:16px}
    .section-title{font-size:12px;font-weight:bold;color:#15803d;border-bottom:1px solid #e2e8f0;padding-bottom:5px;margin-bottom:8px}
    table{width:100%;border-collapse:collapse;font-size:10.5px}
    th{background:#15803d;color:white;padding:6px 8px;text-align:left}
    td{padding:5px 8px;border-bottom:1px solid #f1f5f9;vertical-align:top}
    tr:nth-child(even){background:#f8fafc}
    .badge{display:inline-block;padding:2px 7px;border-radius:99px;font-size:9px;font-weight:bold}
    .badge-green{background:#dcfce7;color:#15803d}
    .badge-amber{background:#fef3c7;color:#b45309}
    .badge-blue{background:#dbeafe;color:#1d4ed8}
    .info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px}
    .info-row{display:flex;gap:8px;padding:3px 0;border-bottom:1px solid #f1f5f9}
    .info-label{color:#94a3b8;width:130px;flex-shrink:0;font-size:10px}
    .progress{height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-top:4px}
    .progress-fill{height:100%;background:#15803d;border-radius:3px}
    .footer{text-align:center;margin-top:20px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}
    @media print{@page{margin:1cm}}
  </style></head><body>

  <div class="header">
    <div>
      <div class="name">👨‍⚕️ Dr. ${doctor.name}</div>
      <div class="sub">${specs} · Reg: ${doctor.registration_number||'N/A'}</div>
      <div class="sub">Status: ${doctor.status} · Joined: ${fmt(doctor.created_at)}</div>
      <div class="sub">Email: ${doctor.email} · Last Login: ${fmt(doctor.last_login)}</div>
    </div>
    <div class="print-date">Doctor Profile Report<br/>Printed: ${today}</div>
  </div>

  <div class="grid4">
    <div class="stat"><div class="stat-val">${stats.totalAppts}</div><div class="stat-lbl">Total Appointments</div></div>
    <div class="stat"><div class="stat-val">${stats.completedAppts}</div><div class="stat-lbl">Completed</div></div>
    <div class="stat"><div class="stat-val">${stats.uniqueAnimals}</div><div class="stat-lbl">Unique Patients</div></div>
    <div class="stat"><div class="stat-val">${stats.completionRate}%</div><div class="stat-lbl">Completion Rate</div></div>
  </div>

  <div class="grid4" style="margin-bottom:14px">
    <div class="stat"><div class="stat-val">${stats.yearAppts}</div><div class="stat-lbl">This Year</div></div>
    <div class="stat"><div class="stat-val">${stats.monthAppts}</div><div class="stat-lbl">This Month</div></div>
    <div class="stat"><div class="stat-val">${stats.todayAppts}</div><div class="stat-lbl">Today</div></div>
    <div class="stat"><div class="stat-val">${stats.emergencyAppts}</div><div class="stat-lbl">Emergencies</div></div>
  </div>

  <div class="grid2">
    <div class="section">
      <div class="section-title">🏥 Hospital Visit History</div>
      <table>
        <thead><tr><th>Hospital</th><th>Visits</th><th>First Visit</th><th>Last Visit</th></tr></thead>
        <tbody>
          ${hospitalVisits?.map(h=>`<tr>
            <td><b>${h.hospital?.name||'—'}</b><br/><span style="color:#94a3b8;font-size:9px">${h.hospital?.code||''}</span></td>
            <td><b>${h.dataValues?.visit_count||h.visit_count||0}</b></td>
            <td>${fmt(h.dataValues?.first_visit||h.first_visit)}</td>
            <td>${fmt(h.dataValues?.last_visit||h.last_visit)}</td>
          </tr>`).join('')||'<tr><td colspan="4" style="color:#94a3b8;text-align:center">No visits</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">🦠 Top Diseases Diagnosed (${stats.totalDiseases} total)</div>
      <table>
        <thead><tr><th>Disease</th><th>Count</th></tr></thead>
        <tbody>
          ${diseaseStats?.map(d=>`<tr><td>${d.disease_name}</td><td><b>${d.count}</b></td></tr>`).join('')||'<tr><td colspan="2" style="color:#94a3b8;text-align:center">No records</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>

  <div class="grid2">
    <div class="section">
      <div class="section-title">🐾 Animal Type Distribution</div>
      <table>
        <thead><tr><th>Animal Type</th><th>Count</th><th>%</th></tr></thead>
        <tbody>
          ${animalTypeStats?.map(a=>`<tr>
            <td>${ANIMAL_EMOJIS[a.animal_type]||'🐾'} ${a.animal_type}</td>
            <td><b>${a.count}</b></td>
            <td>${stats.totalAppts>0?Math.round(a.count/stats.totalAppts*100):0}%</td>
          </tr>`).join('')||'<tr><td colspan="3" style="color:#94a3b8;text-align:center">No data</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">📅 Monthly Performance (Last 12 months)</div>
      <table>
        <thead><tr><th>Month</th><th>Total</th><th>Completed</th><th>Rate</th></tr></thead>
        <tbody>
          ${monthlyPerformance?.slice(-12).map(m=>{
            const rate = parseInt(m.total)>0?Math.round(parseInt(m.completed||0)/parseInt(m.total)*100):0
            return `<tr>
              <td>${MONTH_NAMES[parseInt(m.month)-1]} ${m.year}</td>
              <td>${m.total}</td>
              <td>${m.completed||0}</td>
              <td>${rate}%</td>
            </tr>`
          }).join('')||'<tr><td colspan="4" style="color:#94a3b8;text-align:center">No data</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <div class="section-title">📋 Recent Appointments (Last 10)</div>
    <table>
      <thead><tr><th>Date</th><th>Animal</th><th>Owner</th><th>Type</th><th>Hospital</th><th>Status</th></tr></thead>
      <tbody>
        ${recentAppts?.map(a=>`<tr>
          <td>${fmt(a.appointment_date)}</td>
          <td>${ANIMAL_EMOJIS[a.animal?.animal_type]||'🐾'} ${a.animal?.animal_type||'—'}${a.animal?.breed?' · '+a.animal.breed:''}</td>
          <td>${a.owner?.name||'—'}<br/><span style="color:#94a3b8;font-size:9px">${a.owner?.phone||''}</span></td>
          <td>${a.type}</td>
          <td>${a.hospital?.name||'—'}</td>
          <td><span class="badge ${a.status==='COMPLETED'?'badge-green':a.status==='PENDING'?'badge-amber':'badge-blue'}">${a.status}</span></td>
        </tr>`).join('')||'<tr><td colspan="6" style="color:#94a3b8;text-align:center">No appointments</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="footer">PashuCare ERP · Doctor Profile · Dr. ${doctor.name} · Printed: ${today}</div>
  </body></html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  w.onload = () => setTimeout(() => w.print(), 300)
}

// ════════════════════════════════════════════════════════════
export function DoctorProfileDrawer({ doctorId, open, onClose }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab,     setTab]     = useState('overview')

  useEffect(() => {
    if (!open || !doctorId) return
    setTab('overview')
    setLoading(true)
    doctorApi.getProfile(doctorId)
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, doctorId])

  if (!open) return null

  const { doctor, stats, hospitalVisits, diseaseStats, animalTypeStats, recentAppts, loginHistory, monthlyPerformance } = data || {}
  const today = new Date().toISOString().split('T')[0]
  const specs = doctor ? (Array.isArray(doctor.specializations) ? doctor.specializations : []).join(', ') || '—' : '—'

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose}/>
      <div className="relative w-full max-w-2xl bg-pashu-bg h-full flex flex-col shadow-2xl animate-slide-in">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0 text-base font-bold text-green-700">
              {doctor?.name?.split(' ').map(w=>w[0]).slice(0,2).join('')||'DR'}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-slate-800 truncate">
                {loading ? 'Loading…' : (doctor ? `Dr. ${doctor.name}` : 'Doctor Profile')}
              </h2>
              {doctor && <p className="text-xs text-slate-400 truncate">{specs} · {doctor.registration_number||'No Reg. No.'}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {data && (
              <button onClick={() => printDoctorProfile(data)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium transition-colors">
                <Printer size={13}/> Print Profile
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-slate-200 flex overflow-x-auto flex-shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={'flex-shrink-0 px-4 py-3 text-xs font-medium border-b-2 transition-colors ' +
                (tab===t.id ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-slate-300"/>
          </div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Failed to load profile</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
              <>
                {/* Doctor info */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Doctor Information</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {[
                      ['Name',            `Dr. ${doctor.name}`],
                      ['Email',           doctor.email],
                      ['Reg. Number',     doctor.registration_number || '—'],
                      ['Status',          doctor.status],
                      ['Specializations', specs],
                      ['Last Login',      fmt(doctor.last_login)],
                      ['Joined',          fmt(doctor.created_at)],
                      ['Hospitals',       doctor.assignedHospitals?.length || 1],
                    ].map(([l,v]) => (
                      <div key={l} className="flex gap-2 py-1.5 border-b border-slate-50">
                        <span className="text-xs text-slate-400 w-28 flex-shrink-0">{l}</span>
                        <span className="text-xs font-medium text-slate-700">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatBox label="Total Visits"    value={stats.totalAppts}     color="blue"/>
                  <StatBox label="Completed"       value={stats.completedAppts} color="green"/>
                  <StatBox label="Unique Patients" value={stats.uniqueAnimals}  color="purple"/>
                  <StatBox label="This Year"       value={stats.yearAppts}      color="teal"/>
                  <StatBox label="This Month"      value={stats.monthAppts}     color="blue"/>
                  <StatBox label="Today"           value={stats.todayAppts}     color="green"/>
                </div>

                {/* Completion rate */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700">Completion Rate</p>
                    <span className="text-xl font-display font-bold text-green-700">{stats.completionRate}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: stats.completionRate+'%' }}/>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                    <span>{stats.completedAppts} completed</span>
                    <span>{stats.pendingAppts} pending · {stats.cancelledAppts} cancelled</span>
                  </div>
                </div>

                {/* Hospitals assigned */}
                {doctor.assignedHospitals?.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Assigned Hospitals</p>
                    {doctor.assignedHospitals.map(h => (
                      <div key={h.id} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                        <Building2 size={13} className="text-slate-400 flex-shrink-0"/>
                        <span className="text-sm text-slate-700">{h.name}</span>
                        {h.DoctorHospital?.is_primary && (
                          <span className="text-xs text-green-600 font-semibold ml-auto">★ Primary</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── VISITS ── */}
            {tab === 'visits' && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatBox label="Total"       value={stats.totalAppts}     color="blue"/>
                  <StatBox label="Emergency"   value={stats.emergencyAppts} color="red"/>
                  <StatBox label="Pending"     value={stats.pendingAppts}   color="amber"/>
                  <StatBox label="Completed"   value={stats.completedAppts} color="green"/>
                </div>

                {/* Animal type breakdown */}
                {animalTypeStats?.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Patients by Animal Type</p>
                    <div className="space-y-2">
                      {animalTypeStats.map(a => {
                        const pct = stats.totalAppts > 0 ? Math.round(a.count/stats.totalAppts*100) : 0
                        return (
                          <div key={a.animal_type}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-600">{ANIMAL_EMOJIS[a.animal_type]||'🐾'} {a.animal_type}</span>
                              <span className="font-semibold text-slate-800">{a.count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-green-400 rounded-full" style={{ width: pct+'%' }}/>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Recent appointments */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recent Appointments</p>
                  </div>
                  {!recentAppts?.length ? (
                    <p className="text-center text-sm text-slate-400 py-8">No appointments yet</p>
                  ) : recentAppts.map(a => (
                    <div key={a.id} className={'flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 ' + (a.type==='EMERGENCY'?'bg-red-50/30':'')}>
                      <div className={'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ' + (a.type==='EMERGENCY'?'bg-red-100 text-red-600':'bg-slate-100 text-slate-600')}>
                        {a.type==='EMERGENCY'?'🚨':'#'+(a.token_number||'?')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {ANIMAL_EMOJIS[a.animal?.animal_type]||'🐾'} {a.animal?.animal_type}{a.animal?.breed?' · '+a.animal.breed:''}
                        </p>
                        <p className="text-xs text-slate-400">{a.owner?.name} · {fmt(a.appointment_date)} · {a.hospital?.name}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0
                        ${a.status==='COMPLETED'?'bg-green-50 text-green-700 border-green-200':
                          a.status==='PENDING'?'bg-amber-50 text-amber-700 border-amber-200':
                          'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── HOSPITALS ── */}
            {tab === 'hospitals' && (
              <>
                <div className="space-y-3">
                  {!hospitalVisits?.length ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">No hospital visit data</div>
                  ) : hospitalVisits.map((h, i) => {
                    const vc = parseInt(h.dataValues?.visit_count || h.visit_count || 0)
                    const pct = stats.totalAppts > 0 ? Math.round(vc/stats.totalAppts*100) : 0
                    return (
                      <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Building2 size={16} className="text-blue-400 flex-shrink-0"/>
                            <div>
                              <p className="font-semibold text-slate-800">{h.hospital?.name}</p>
                              <code className="text-xs text-slate-400">{h.hospital?.code}</code>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-xl font-display font-bold text-blue-700">{vc}</span>
                            <span className="text-xs text-slate-400 ml-1">visits</span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: pct+'%' }}/>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>First visit: {fmt(h.dataValues?.first_visit||h.first_visit)}</span>
                          <span>Last visit: {fmt(h.dataValues?.last_visit||h.last_visit)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* ── DISEASES ── */}
            {tab === 'diseases' && (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center mb-2">
                  <span className="text-2xl font-display font-bold text-slate-800">{stats.totalDiseases}</span>
                  <span className="text-sm text-slate-400 ml-2">total disease records diagnosed</span>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Most Diagnosed Diseases</p>
                  </div>
                  {!diseaseStats?.length ? (
                    <p className="text-center text-sm text-slate-400 py-8">No disease records</p>
                  ) : diseaseStats.map((d, i) => {
                    const pct = stats.totalDiseases > 0 ? Math.round(parseInt(d.count)/stats.totalDiseases*100) : 0
                    return (
                      <div key={i} className="px-4 py-3 border-b border-slate-50 last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-800">{d.disease_name}</span>
                          <span className="text-sm font-bold text-slate-700">{d.count} <span className="text-xs font-normal text-slate-400">({pct}%)</span></span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full" style={{ width: pct+'%' }}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* ── PERFORMANCE ── */}
            {tab === 'performance' && (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Monthly Appointments (Last 12 Months)</p>
                  </div>
                  {!monthlyPerformance?.length ? (
                    <p className="text-center text-sm text-slate-400 py-8">No performance data</p>
                  ) : (
                    <div className="p-4 space-y-2">
                      {monthlyPerformance.slice(-12).map((m, i) => {
                        const total     = parseInt(m.total||0)
                        const completed = parseInt(m.completed||0)
                        const rate      = total > 0 ? Math.round(completed/total*100) : 0
                        const maxTotal  = Math.max(...monthlyPerformance.map(x=>parseInt(x.total||0)), 1)
                        const barPct    = Math.round(total/maxTotal*100)
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 w-16 flex-shrink-0 text-right">{MONTH_NAMES[parseInt(m.month)-1]} {m.year}</span>
                            <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden relative">
                              <div className="h-full bg-green-200 rounded-lg" style={{ width: barPct+'%' }}>
                                <div className="h-full bg-green-500 rounded-lg" style={{ width: rate+'%' }}/>
                              </div>
                              <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-slate-700">
                                {total} visits · {rate}% completed
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      <div className="flex items-center gap-3 pt-1 mt-1 border-t border-slate-100">
                        <span className="text-xs text-slate-400 w-16"/>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block"/>Completed</span>
                          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block"/>Total</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── ACTIVITY LOG ── */}
            {tab === 'activity' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recent Activity ({loginHistory?.length||0} events)</p>
                </div>
                {!loginHistory?.length ? (
                  <p className="text-center text-sm text-slate-400 py-8">No activity recorded</p>
                ) : loginHistory.map((log, i) => {
                  const icons = { LOGIN:'🔐', LOGOUT:'👋', CREATE_APPOINTMENT:'📅', UPDATE_APPOINTMENT_STATUS:'✅' }
                  const colors = { LOGIN:'text-green-600', LOGOUT:'text-slate-500', CREATE_APPOINTMENT:'text-blue-600', UPDATE_APPOINTMENT_STATUS:'text-purple-600' }
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                      <span className="text-lg flex-shrink-0">{icons[log.action]||'📝'}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${colors[log.action]||'text-slate-700'}`}>
                          {log.action.replace(/_/g,' ')}
                        </p>
                        {log.ip_address && <p className="text-xs text-slate-400">IP: {log.ip_address}</p>}
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0">{fmtDT(log.created_at)}</span>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}
