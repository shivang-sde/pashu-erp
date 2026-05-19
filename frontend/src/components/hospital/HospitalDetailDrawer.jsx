import { useState, useEffect } from 'react'
import {
  X, Building2, Users, PawPrint, CalendarDays,
  ReceiptText, Package, Printer, Phone, Mail,
  MapPin, Stethoscope, Pill, CheckCircle2,
  Clock, AlertTriangle, TrendingUp, Loader2,
} from 'lucide-react'
import { hospitalApi } from '../../api/hospitals.js'

const ANIMAL_EMOJIS = { COW:'🐄', BUFFALO:'🐃', GOAT:'🐐', DOG:'🐕', CAMEL:'🐪', HORSE:'🐎', SHEEP:'🐑', OTHER:'🐾' }

const ROLE_CONFIG = {
  HOSPITAL_ADMIN: { label:'Admin',         icon:'🏥', color:'bg-blue-100 text-blue-700' },
  DOCTOR:         { label:'Doctor',        icon:'👨‍⚕️', color:'bg-green-100 text-green-700' },
  PHARMACIST:     { label:'Pharmacist',    icon:'💊', color:'bg-amber-100 text-amber-700' },
  RECEPTIONIST:   { label:'Receptionist', icon:'📋', color:'bg-teal-100 text-teal-700' },
}

const TABS = [
  { id:'overview',     label:'Overview',     icon: Building2 },
  { id:'staff',        label:'Staff',        icon: Users },
  { id:'patients',     label:'Patients',     icon: PawPrint },
  { id:'appointments', label:'Appointments', icon: CalendarDays },
  { id:'billing',      label:'Billing',      icon: ReceiptText },
  { id:'stock',        label:'Stock',        icon: Package },
]

function KV({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-700 font-medium">{value}</span>
    </div>
  )
}

function StatCard({ icon:Icon, label, value, color='blue' }) {
  const colors = { blue:'bg-blue-50 text-blue-700', green:'bg-green-50 text-green-700', amber:'bg-amber-50 text-amber-700', red:'bg-red-50 text-red-700' }
  return (
    <div className={'rounded-xl p-3 ' + (colors[color]||colors.blue)}>
      <div className="text-xl font-display font-bold">{value ?? 0}</div>
      <div className="text-xs font-medium mt-0.5 opacity-75">{label}</div>
    </div>
  )
}

function Badge({ children, color='gray' }) {
  const map = { green:'bg-green-50 text-green-700 border-green-200', amber:'bg-amber-50 text-amber-700 border-amber-200', red:'bg-red-50 text-red-600 border-red-200', gray:'bg-slate-100 text-slate-600 border-slate-200', blue:'bg-blue-50 text-blue-700 border-blue-200' }
  return <span className={'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ' + (map[color]||map.gray)}>{children}</span>
}

// ── Print function ────────────────────────────────────────────
function printHospital(data) {
  if (!data) return
  const { hospital, staff, animals, appointments, billing } = data
  const today = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })

  const html = `<!DOCTYPE html><html><head>
  <title>Hospital Profile — ${hospital.name}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 24px; }
    .header { border-bottom: 3px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 20px; display:flex; justify-content:space-between; align-items:flex-start; }
    .hospital-name { font-size: 22px; font-weight: bold; color: #1d4ed8; }
    .subtitle { color: #64748b; font-size: 11px; margin-top: 4px; }
    .print-date { font-size: 11px; color: #94a3b8; text-align: right; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 13px; font-weight: bold; color: #1d4ed8; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
    .stat-value { font-size: 20px; font-weight: bold; color: #1d4ed8; }
    .stat-label { font-size: 10px; color: #64748b; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
    th { background: #1d4ed8; color: white; padding: 7px 10px; text-align: left; }
    td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
    tr:nth-child(even) { background: #f8fafc; }
    .role-pill { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: bold; background: #e0e7ff; color: #3730a3; }
    .footer { text-align: center; margin-top: 28px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print { @page { margin: 1cm; } }
  </style></head><body>

  <div class="header">
    <div>
      <div class="hospital-name">🏥 ${hospital.name}</div>
      <div class="subtitle">${hospital.code} · ${hospital.type} · ${hospital.district?.name || ''}</div>
      ${hospital.address ? '<div class="subtitle" style="margin-top:3px">📍 '+hospital.address+'</div>' : ''}
      ${hospital.phone ? '<div class="subtitle">📞 '+hospital.phone+(hospital.email ? ' · ✉️ '+hospital.email:'')+'</div>' : ''}
    </div>
    <div class="print-date">Hospital Profile Report<br/>Printed: ${today}<br/>Status: <b>${hospital.status}</b></div>
  </div>

  <div class="section">
    <div class="section-title">📊 Key Metrics</div>
    <div class="grid-4">
      <div class="stat-box"><div class="stat-value">${staff.total}</div><div class="stat-label">Total Staff</div></div>
      <div class="stat-box"><div class="stat-value">${animals.total}</div><div class="stat-label">Animals Registered</div></div>
      <div class="stat-box"><div class="stat-value">${appointments.total}</div><div class="stat-label">Total Appointments</div></div>
      <div class="stat-box"><div class="stat-value">₹${parseFloat(billing.totalRevenue||0).toLocaleString('en-IN')}</div><div class="stat-label">Total Revenue</div></div>
    </div>
  </div>

  <div class="grid-2">
    <div class="section">
      <div class="section-title">👥 Staff Summary</div>
      <table>
        <thead><tr><th>Role</th><th>Count</th></tr></thead>
        <tbody>
          ${Object.entries(staff.byRole).map(([role,count]) => `<tr><td>${ROLE_CONFIG[role]?.icon||''} ${ROLE_CONFIG[role]?.label||role}</td><td><b>${count}</b></td></tr>`).join('')}
          <tr style="font-weight:bold;background:#e0e7ff"><td>Total</td><td>${staff.total}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">🐾 Animal Distribution</div>
      <table>
        <thead><tr><th>Type</th><th>Count</th></tr></thead>
        <tbody>${animals.byType.map(a => `<tr><td>${ANIMAL_EMOJIS[a.animal_type]||'🐾'} ${a.animal_type}</td><td><b>${a.count}</b></td></tr>`).join('')}</tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <div class="section-title">👨‍⚕️ Doctors (${staff.list?.filter(s=>s.role==='DOCTOR').length || 0})</div>
    <table>
      <thead><tr><th>Name</th><th>Specializations</th><th>Status</th></tr></thead>
      <tbody>
        ${staff.list?.filter(s=>s.role==='DOCTOR').map(d => {
          const specs = Array.isArray(d.specializations) ? d.specializations.join(', ') : (d.specializations||'—')
          return `<tr><td>${d.name}</td><td>${specs}</td><td>${d.status}</td></tr>`
        }).join('')||'<tr><td colspan="3" style="text-align:center;color:#94a3b8">No doctors</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">📅 Recent Appointments (Today: ${appointments.today} | Pending: ${appointments.pending})</div>
    <table>
      <thead><tr><th>Token</th><th>Animal</th><th>Type</th><th>Doctor</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>
        ${appointments.recent?.map(a => `<tr>
          <td>#${a.token_number||'EMG'}</td>
          <td>${a.animal?.animal_type||'—'}${a.animal?.breed?' · '+a.animal.breed:''}</td>
          <td>${a.type}</td>
          <td>${a.doctor?.name||'Not assigned'}</td>
          <td>${a.status}</td>
          <td>${a.appointment_date}</td>
        </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:#94a3b8">No recent appointments</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">💰 Billing Summary (Month Revenue: ₹${parseFloat(billing.monthRevenue||0).toLocaleString('en-IN')} | Pending Bills: ${billing.pending})</div>
    <table>
      <thead><tr><th>Bill No.</th><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>
        ${billing.recent?.map(b => `<tr>
          <td>${b.bill_number}</td>
          <td>${b.bill_type}</td>
          <td>₹${parseFloat(b.total_amount).toFixed(2)}</td>
          <td>${b.status}</td>
          <td>${b.bill_date}</td>
        </tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:#94a3b8">No recent bills</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="footer">PashuCare ERP — Hospital Profile Report · Generated on ${today} · ${hospital.name}</div>
  </body></html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  w.onload = () => w.print()
}

// ════════════════════════════════════════════════════════════
export function HospitalDetailDrawer({ hospitalId, open, onClose }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab,     setTab]     = useState('overview')

  useEffect(() => {
    if (!open || !hospitalId) return
    setTab('overview')
    setLoading(true)
    hospitalApi.getDetail(hospitalId)
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, hospitalId])

  if (!open) return null

  const { hospital, staff, animals, appointments, billing, stock } = data || {}

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose}/>
      <div className="relative w-full max-w-2xl bg-pashu-bg h-full flex flex-col shadow-2xl animate-slide-in">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
              <Building2 size={18} className="text-primary-600"/>
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-slate-800 truncate">
                {loading ? 'Loading…' : (hospital?.name || 'Hospital Details')}
              </h2>
              {hospital && <p className="text-xs text-slate-400">{hospital.code} · {hospital.district?.name} · {hospital.type}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {data && (
              <button onClick={() => printHospital(data)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors">
                <Printer size={13}/> Print
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-slate-200 flex overflow-x-auto flex-shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={'flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ' +
                (tab===t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
              <t.icon size={13}/>{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-slate-300"/>
          </div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Failed to load hospital data</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
              <>
                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard icon={Users}       label="Total Staff"    value={staff.total}            color="blue"/>
                  <StatCard icon={PawPrint}    label="Animals"        value={animals.total}          color="green"/>
                  <StatCard icon={CalendarDays}label="Appointments"   value={appointments.total}     color="amber"/>
                  <StatCard icon={TrendingUp}  label="Total Revenue"  value={'₹'+parseFloat(billing.totalRevenue||0).toLocaleString('en-IN')} color="green"/>
                </div>

                {/* Hospital info */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Hospital Information</p>
                  <KV label="Name"         value={hospital.name}/>
                  <KV label="Code"         value={hospital.code}/>
                  <KV label="Type"         value={hospital.type}/>
                  <KV label="Status"       value={hospital.status}/>
                  <KV label="District"     value={hospital.district?.name}/>
                  <KV label="Address"      value={hospital.address}/>
                  <KV label="Phone"        value={hospital.phone}/>
                  <KV label="Email"        value={hospital.email}/>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Today</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-slate-500">Appointments</span><span className="font-bold text-slate-800">{appointments.today}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-slate-500">Bills raised</span><span className="font-bold text-slate-800">{billing.today}</span></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Pending</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-slate-500">Appointments</span><span className="font-bold text-amber-600">{appointments.pending}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-slate-500">Bills</span><span className="font-bold text-amber-600">{billing.pending}</span></div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── STAFF ── */}
            {tab === 'staff' && (
              <>
                {/* Role breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(staff.byRole).map(([role, count]) => (
                    <div key={role} className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
                      <div className="text-2xl mb-1">{ROLE_CONFIG[role]?.icon}</div>
                      <div className="text-xl font-display font-bold text-slate-800">{count}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{ROLE_CONFIG[role]?.label}</div>
                    </div>
                  ))}
                </div>

                {/* Staff list */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">All Staff ({staff.list?.length||0})</p>
                  </div>
                  {staff.list?.map(u => (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <div className={'w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ' + (ROLE_CONFIG[u.role]?.color||'bg-slate-100 text-slate-600')}>
                        {ROLE_CONFIG[u.role]?.icon||'👤'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                      <Badge color={u.status==='ACTIVE'?'green':u.status==='SUSPENDED'?'red':'gray'}>{u.status}</Badge>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── PATIENTS ── */}
            {tab === 'patients' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={PawPrint} label="Total Animals" value={animals.total}  color="blue"/>
                  <StatCard icon={CheckCircle2} label="Active"    value={animals.active} color="green"/>
                </div>

                {/* By type */}
                {animals.byType?.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">By Animal Type</p>
                    <div className="grid grid-cols-2 gap-2">
                      {animals.byType.map(a => (
                        <div key={a.animal_type} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50">
                          <span className="text-sm text-slate-600">{ANIMAL_EMOJIS[a.animal_type]||'🐾'} {a.animal_type}</span>
                          <span className="font-bold text-slate-800">{a.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recent Registrations</p>
                  </div>
                  {animals.recent?.map(a => (
                    <div key={a.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                      <span className="text-2xl">{ANIMAL_EMOJIS[a.animal_type]||'🐾'}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{a.animal_type}{a.breed?' · '+a.breed:''}{a.name?' "'+a.name+'"':''}</p>
                        {a.ear_tag && <p className="text-xs text-slate-400">🏷️ {a.ear_tag}</p>}
                      </div>
                      <Badge color={a.status==='ACTIVE'?'green':'amber'}>{a.status}</Badge>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── APPOINTMENTS ── */}
            {tab === 'appointments' && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard icon={CalendarDays} label="Total"     value={appointments.total}     color="blue"/>
                  <StatCard icon={Clock}        label="Today"     value={appointments.today}     color="amber"/>
                  <StatCard icon={AlertTriangle}label="Pending"   value={appointments.pending}   color="red"/>
                  <StatCard icon={CheckCircle2} label="Completed" value={appointments.completed} color="green"/>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recent Appointments</p>
                  </div>
                  {!appointments.recent?.length ? (
                    <p className="text-center text-sm text-slate-400 py-8">No appointments yet</p>
                  ) : appointments.recent.map(a => (
                    <div key={a.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-600">
                        {a.type==='EMERGENCY' ? '🚨' : '#'+(a.token_number||'?')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {a.animal?.animal_type||'Animal'}{a.animal?.breed?' · '+a.animal.breed:''}
                        </p>
                        <p className="text-xs text-slate-400">{a.appointment_date} · {a.doctor?.name||'No doctor'}</p>
                      </div>
                      <Badge color={a.status==='COMPLETED'?'green':a.status==='PENDING'?'amber':'blue'}>{a.status}</Badge>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── BILLING ── */}
            {tab === 'billing' && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard icon={ReceiptText} label="Total Bills"   value={billing.total}       color="blue"/>
                  <StatCard icon={Clock}       label="Today"         value={billing.today}       color="amber"/>
                  <StatCard icon={AlertTriangle}label="Pending"      value={billing.pending}     color="red"/>
                  <StatCard icon={TrendingUp}  label="Month Revenue" value={'₹'+parseFloat(billing.monthRevenue||0).toLocaleString('en-IN')} color="green"/>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recent Bills</p>
                    <p className="text-xs font-bold text-green-700">Total Revenue: ₹{parseFloat(billing.totalRevenue||0).toLocaleString('en-IN')}</p>
                  </div>
                  {!billing.recent?.length ? (
                    <p className="text-center text-sm text-slate-400 py-8">No bills yet</p>
                  ) : billing.recent.map(b => (
                    <div key={b.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <code className="text-xs text-primary-600 font-mono font-semibold">{b.bill_number}</code>
                        <p className="text-xs text-slate-400 mt-0.5">{b.bill_type} · {b.bill_date} · {b.payment_mode}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-slate-800">₹{parseFloat(b.total_amount).toFixed(0)}</p>
                        <Badge color={b.status==='PAID'?'green':b.status==='PENDING'?'amber':'red'}>{b.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── STOCK ── */}
            {tab === 'stock' && (
              <>
                {/* Medicine stock */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Medicine Stock ({stock.medicines?.length||0} batches)</p>
                  </div>
                  {!stock.medicines?.length ? (
                    <p className="text-center text-sm text-slate-400 py-6">No medicine stock</p>
                  ) : stock.medicines.map(b => {
                    const today = new Date().toISOString().split('T')[0]
                    const isLow     = b.quantity <= (b.medicine?.min_stock_level || 10)
                    const isExpired = b.expiry_date && b.expiry_date < today
                    return (
                      <div key={b.id} className={'flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 ' + (isLow||isExpired?'bg-red-50/30':'')}>
                        <Pill size={14} className={'flex-shrink-0 ' + (isLow?'text-red-400':'text-blue-400')}/>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{b.medicine?.name}</p>
                          <p className="text-xs text-slate-400">Batch: {b.batch_number} · Exp: {b.expiry_date}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={'font-bold ' + (isLow?'text-red-600':'text-slate-800')}>{b.quantity}</span>
                          <span className="text-xs text-slate-400 ml-1">{b.medicine?.unit}</span>
                          {isExpired && <p className="text-xs text-red-500 font-medium">EXPIRED</p>}
                          {!isExpired && isLow && <p className="text-xs text-amber-600 font-medium">Low</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Inventory stock */}
                {stock.inventory?.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Inventory ({stock.inventory.length} items)</p>
                    </div>
                    {stock.inventory.map(s => (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                        <Package size={14} className="text-purple-400 flex-shrink-0"/>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">{s.item?.name}</p>
                          <p className="text-xs text-slate-400">{s.item?.category}</p>
                        </div>
                        <span className="font-bold text-slate-800">{s.quantity} <span className="text-xs text-slate-400 font-normal">{s.item?.unit}</span></span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent movements */}
                {stock.recentMovements?.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recent Stock Movements</p>
                    </div>
                    {stock.recentMovements.map(m => (
                      <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">{m.medicine?.name}</p>
                          <p className="text-xs text-slate-400">{new Date(m.created_at).toLocaleDateString('en-IN')}</p>
                        </div>
                        <span className={'text-sm font-bold ' + (['IN','TRANSFER_IN'].includes(m.type)?'text-green-600':'text-red-600')}>
                          {['IN','TRANSFER_IN'].includes(m.type)?'+':'-'}{m.quantity}
                        </span>
                        <span className="text-xs text-slate-400">{m.type.replace('_',' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
