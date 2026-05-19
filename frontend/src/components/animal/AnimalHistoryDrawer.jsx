import { useState, useEffect } from 'react'
import {
  X, PawPrint, Printer, Loader2,
  CalendarDays, AlertCircle, Syringe,
  ReceiptText, Building2, UserCheck,
  Clock, TrendingUp, CheckCircle2,
} from 'lucide-react'
import { animalApi } from '../../api/animals.js'

const ANIMAL_EMOJIS = { COW:'🐄', BUFFALO:'🐃', GOAT:'🐐', DOG:'🐕', CAMEL:'🐪', HORSE:'🐎', SHEEP:'🐑', OTHER:'🐾' }

const TIMELINE_CONFIG = {
  APPOINTMENT: { icon: CalendarDays, color: 'bg-blue-100 text-blue-600',    label: 'Appointment',  dot: 'bg-blue-400' },
  DISEASE:     { icon: AlertCircle,  color: 'bg-red-100 text-red-600',      label: 'Disease',      dot: 'bg-red-400' },
  VACCINATION: { icon: Syringe,      color: 'bg-green-100 text-green-600',  label: 'Vaccination',  dot: 'bg-green-400' },
  BILL:        { icon: ReceiptText,  color: 'bg-purple-100 text-purple-600',label: 'Bill',         dot: 'bg-purple-400' },
}

const STATUS_APPT = {
  COMPLETED:   'bg-green-50 text-green-700 border-green-200',
  PENDING:     'bg-amber-50 text-amber-700 border-amber-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  CANCELLED:   'bg-red-50 text-red-600 border-red-200',
  NO_SHOW:     'bg-slate-100 text-slate-500 border-slate-200',
  CONFIRMED:   'bg-teal-50 text-teal-700 border-teal-200',
}

function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
}

// ── Print function ────────────────────────────────────────────
function printAnimalHistory(data) {
  if (!data) return
  const { animal, stats, summary, appointments, diseases, vaccinations, bills } = data
  const today = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
  const emoji = ANIMAL_EMOJIS[animal.animal_type] || '🐾'

  const html = `<!DOCTYPE html><html><head>
  <title>Animal History — ${animal.animal_type} ${animal.name||''}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 24px; }
    .header { border-bottom: 3px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 20px; display:flex; justify-content:space-between; align-items:flex-start; }
    .title { font-size: 20px; font-weight: bold; color: #1d4ed8; }
    .subtitle { color: #64748b; font-size: 11px; margin-top: 3px; }
    .print-date { font-size: 11px; color: #94a3b8; text-align: right; }
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .section-title { font-size: 13px; font-weight: bold; color: #1d4ed8; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
    .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
    .stat-value { font-size: 18px; font-weight: bold; color: #1d4ed8; }
    .stat-label { font-size: 10px; color: #64748b; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #1d4ed8; color: white; padding: 7px 10px; text-align: left; }
    td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    tr:nth-child(even) { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: bold; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-amber { background: #fef3c7; color: #b45309; }
    .badge-red   { background: #fee2e2; color: #dc2626; }
    .badge-blue  { background: #dbeafe; color: #1d4ed8; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; font-size: 11px; }
    .info-row { display: flex; gap: 8px; padding: 3px 0; border-bottom: 1px solid #f1f5f9; }
    .info-label { color: #94a3b8; width: 100px; flex-shrink: 0; }
    .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print { @page { margin: 1cm; } .section { page-break-inside: avoid; } }
  </style></head><body>

  <div class="header">
    <div>
      <div class="title">${emoji} Animal Medical History</div>
      <div class="subtitle">
        <b>${animal.animal_type}</b>${animal.breed ? ' · '+animal.breed : ''}${animal.name ? ' · "'+animal.name+'"' : ''}
        ${animal.ear_tag ? ' · 🏷️ '+animal.ear_tag : ''}
      </div>
      <div class="subtitle" style="margin-top:4px">
        Owner: <b>${animal.owner?.name}</b> · ${animal.owner?.phone}
        ${animal.owner?.village ? ' · '+animal.owner.village : ''}
      </div>
    </div>
    <div class="print-date">Medical History Report<br/>Printed: ${today}</div>
  </div>

  <div class="grid-4">
    <div class="stat-box"><div class="stat-value">${stats.totalVisits}</div><div class="stat-label">Total Visits</div></div>
    <div class="stat-box"><div class="stat-value">${stats.totalDiseases}</div><div class="stat-label">Disease Records</div></div>
    <div class="stat-box"><div class="stat-value">${stats.totalVaccinations}</div><div class="stat-label">Vaccinations</div></div>
    <div class="stat-box"><div class="stat-value">₹${parseFloat(stats.totalRevenue||0).toLocaleString('en-IN')}</div><div class="stat-label">Total Spent</div></div>
  </div>

  <div class="grid-2">
    <div class="info-box">
      <div style="font-weight:bold;margin-bottom:6px;color:#1d4ed8">🐾 Animal Details</div>
      <div class="info-row"><span class="info-label">Type</span><b>${animal.animal_type}</b></div>
      <div class="info-row"><span class="info-label">Breed</span>${animal.breed||'—'}</div>
      <div class="info-row"><span class="info-label">Gender</span>${animal.gender}</div>
      <div class="info-row"><span class="info-label">Age</span>${animal.age_years?animal.age_years+'y ':''}${animal.age_months?animal.age_months+'m':''||'—'}</div>
      <div class="info-row"><span class="info-label">Weight</span>${animal.weight_kg?animal.weight_kg+' kg':'—'}</div>
      <div class="info-row"><span class="info-label">Ear Tag</span>${animal.ear_tag||'—'}</div>
      <div class="info-row"><span class="info-label">Status</span><span class="badge badge-green">${animal.status}</span></div>
    </div>
    <div class="info-box">
      <div style="font-weight:bold;margin-bottom:6px;color:#1d4ed8">👤 Owner Details</div>
      <div class="info-row"><span class="info-label">Name</span><b>${animal.owner?.name}</b></div>
      <div class="info-row"><span class="info-label">Phone</span>${animal.owner?.phone}</div>
      <div class="info-row"><span class="info-label">Village</span>${animal.owner?.village||'—'}</div>
      <div class="info-row"><span class="info-label">Address</span>${animal.owner?.address||'—'}</div>
      <div style="margin-top:8px;font-size:11px;color:#64748b">
        Hospitals visited: <b>${summary.hospitals.join(', ')||'—'}</b><br/>
        Doctors attended: <b>${summary.doctors.join(', ')||'—'}</b>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">📅 Visit History (${appointments.length} appointments)</div>
    ${appointments.length ? `
    <table>
      <thead><tr><th>Token</th><th>Date</th><th>Type</th><th>Hospital</th><th>Doctor</th><th>Chief Complaint</th><th>Status</th></tr></thead>
      <tbody>
        ${appointments.map(a => `<tr>
          <td>#${a.token_number||'EMG'}</td>
          <td>${fmt(a.appointment_date)}</td>
          <td>${a.type}</td>
          <td>${a.hospital?.name||'—'}</td>
          <td>${a.doctor?.name||'Not assigned'}</td>
          <td>${a.chief_complaint||'—'}</td>
          <td><span class="badge ${a.status==='COMPLETED'?'badge-green':a.status==='PENDING'?'badge-amber':'badge-blue'}">${a.status}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p style="color:#94a3b8;padding:8px">No visit records</p>'}
  </div>

  <div class="section">
    <div class="section-title">🦠 Disease History (${diseases.length} records)</div>
    ${diseases.length ? `
    <table>
      <thead><tr><th>Disease</th><th>Symptoms</th><th>Treatment</th><th>Doctor</th><th>Diagnosed</th><th>Status</th></tr></thead>
      <tbody>
        ${diseases.map(d => `<tr>
          <td><b>${d.disease_name}</b></td>
          <td>${d.symptoms||'—'}</td>
          <td>${d.treatment||'—'}</td>
          <td>${d.doctor?.name||'—'}</td>
          <td>${fmt(d.diagnosed_at)}</td>
          <td><span class="badge ${d.status==='RESOLVED'?'badge-green':d.status==='ACTIVE'?'badge-red':'badge-amber'}">${d.status}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p style="color:#94a3b8;padding:8px">No disease records</p>'}
  </div>

  <div class="section">
    <div class="section-title">💉 Vaccination Records (${vaccinations.length})</div>
    ${vaccinations.length ? `
    <table>
      <thead><tr><th>Vaccine</th><th>Prevents</th><th>Dose</th><th>Batch</th><th>Given On</th><th>Next Due</th><th>Given By</th></tr></thead>
      <tbody>
        ${vaccinations.map(v => `<tr>
          <td><b>${v.vaccine_name}</b></td>
          <td>${v.disease_prevented||'—'}</td>
          <td>${v.dose||'—'}</td>
          <td>${v.batch_number||'—'}</td>
          <td>${fmt(v.vaccinated_at)}</td>
          <td>${v.next_due_at?'<span class="badge '+(v.next_due_at<new Date().toISOString().split('T')[0]?'badge-red':'badge-blue')+'">'+fmt(v.next_due_at)+'</span>':'—'}</td>
          <td>${v.administrator?.name||'—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p style="color:#94a3b8;padding:8px">No vaccination records</p>'}
  </div>

  <div class="section">
    <div class="section-title">💰 Billing Records (${bills.length} bills · Total: ₹${parseFloat(stats.totalRevenue||0).toLocaleString('en-IN')})</div>
    ${bills.length ? `
    <table>
      <thead><tr><th>Bill No.</th><th>Type</th><th>Items</th><th>Amount</th><th>Payment</th><th>Date</th><th>Status</th></tr></thead>
      <tbody>
        ${bills.map(b => `<tr>
          <td><b>${b.bill_number}</b></td>
          <td>${b.bill_type}</td>
          <td>${b.items?.map(i=>i.item_name).join(', ')||'—'}</td>
          <td>₹${parseFloat(b.total_amount).toFixed(2)}</td>
          <td>${b.payment_mode}</td>
          <td>${fmt(b.bill_date)}</td>
          <td><span class="badge ${b.status==='PAID'?'badge-green':b.status==='PENDING'?'badge-amber':'badge-red'}">${b.status}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p style="color:#94a3b8;padding:8px">No billing records</p>'}
  </div>

  <div class="footer">PashuCare ERP — Animal Medical History · Printed: ${today} · ${animal.animal_type}${animal.name?' "'+animal.name+'"':''} · Owner: ${animal.owner?.name}</div>
  </body></html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  w.onload = () => w.print()
}

// ════════════════════════════════════════════════════════════
export function AnimalHistoryDrawer({ animalId, open, onClose }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab,     setTab]     = useState('timeline')

  useEffect(() => {
    if (!open || !animalId) return
    setTab('timeline')
    setLoading(true)
    animalApi.getHistory(animalId)
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, animalId])

  if (!open) return null

  const { animal, timeline, stats, summary, appointments, diseases, vaccinations, bills } = data || {}
  const today = new Date().toISOString().split('T')[0]

  const TABS = [
    { id:'timeline',     label:'Timeline',    count: timeline?.length },
    { id:'visits',       label:'Visits',      count: appointments?.length },
    { id:'diseases',     label:'Diseases',    count: diseases?.length },
    { id:'vaccinations', label:'Vaccinations',count: vaccinations?.length },
    { id:'billing',      label:'Billing',     count: bills?.length },
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose}/>
      <div className="relative w-full max-w-2xl bg-pashu-bg h-full flex flex-col shadow-2xl animate-slide-in">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-3xl flex-shrink-0">
              {animal ? (ANIMAL_EMOJIS[animal.animal_type]||'🐾') : '🐾'}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-slate-800">
                {loading ? 'Loading…' : animal ? (
                  `${animal.animal_type}${animal.breed?' · '+animal.breed:''}${animal.name?' "'+animal.name+'"':''}`
                ) : 'Animal History'}
              </h2>
              {animal && (
                <p className="text-xs text-slate-400">
                  {animal.owner?.name} · {animal.owner?.phone}
                  {animal.ear_tag && ` · 🏷️ ${animal.ear_tag}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {data && (
              <button onClick={() => printAnimalHistory(data)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors">
                <Printer size={13}/> Print
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
              <X size={16}/>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-slate-200 flex overflow-x-auto flex-shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={'flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ' +
                (tab===t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
              {t.label}
              {t.count !== undefined && (
                <span className={'px-1.5 py-0.5 rounded-full text-xs font-bold ' +
                  (tab===t.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500')}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-slate-300"/>
          </div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Failed to load history</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
                <div className="text-xl font-display font-bold text-blue-700">{stats.totalVisits}</div>
                <div className="text-xs text-slate-400">Total Visits</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
                <div className="text-xl font-display font-bold text-red-600">{stats.totalDiseases}</div>
                <div className="text-xs text-slate-400">Disease Records</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
                <div className="text-xl font-display font-bold text-green-700">{stats.totalVaccinations}</div>
                <div className="text-xs text-slate-400">Vaccinations</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
                <div className="text-xl font-display font-bold text-purple-700">₹{parseFloat(stats.totalRevenue||0).toLocaleString('en-IN')}</div>
                <div className="text-xs text-slate-400">Total Spent</div>
              </div>
            </div>

            {/* Alerts */}
            {(stats.overdueVaccinations > 0 || stats.upcomingVaccinations > 0) && (
              <div className="space-y-2">
                {stats.overdueVaccinations > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-red-700">
                    <AlertCircle size={15}/> <b>{stats.overdueVaccinations}</b> overdue vaccination{stats.overdueVaccinations>1?'s':''}
                  </div>
                )}
                {stats.upcomingVaccinations > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-amber-700">
                    <Clock size={15}/> <b>{stats.upcomingVaccinations}</b> vaccination{stats.upcomingVaccinations>1?'s':''} due within 30 days
                  </div>
                )}
              </div>
            )}

            {/* ── TIMELINE TAB ── */}
            {tab === 'timeline' && (
              <div className="space-y-3">
                {!timeline?.length ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
                    <PawPrint size={32} className="mx-auto mb-3 text-slate-300"/>
                    <p>No history records yet</p>
                  </div>
                ) : timeline.map((event, i) => {
                  const cfg = TIMELINE_CONFIG[event.type]
                  const Icon = cfg?.icon || CalendarDays
                  const d = event.data

                  return (
                    <div key={i} className="flex gap-3">
                      {/* Dot + line */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ' + (cfg?.color||'bg-slate-100 text-slate-500')}>
                          <Icon size={14}/>
                        </div>
                        {i < timeline.length-1 && <div className="w-0.5 flex-1 bg-slate-200 my-1"/>}
                      </div>

                      {/* Card */}
                      <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-3 mb-1">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <span className={'text-xs font-bold px-2 py-0.5 rounded-full ' + (cfg?.color||'')}>
                              {cfg?.label}
                            </span>
                            <span className="text-xs text-slate-400 ml-2">{fmt(event.date)}</span>
                          </div>
                        </div>

                        {event.type === 'APPOINTMENT' && (
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-slate-800">{d.type} Visit</span>
                              <span className={'text-xs px-2 py-0.5 rounded-full border ' + (STATUS_APPT[d.status]||'bg-slate-100 text-slate-500 border-slate-200')}>{d.status}</span>
                            </div>
                            {d.hospital && <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Building2 size={10}/>{d.hospital.name}</p>}
                            {d.doctor   && <p className="text-xs text-slate-500 flex items-center gap-1"><UserCheck size={10}/>Dr. {d.doctor.name}</p>}
                            {d.chief_complaint && <p className="text-xs text-slate-400 mt-1 italic">"{d.chief_complaint}"</p>}
                            {d.token_number && <p className="text-xs text-slate-400">Token #{d.token_number}</p>}
                          </div>
                        )}

                        {event.type === 'DISEASE' && (
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{d.disease_name}</p>
                            {d.symptoms  && <p className="text-xs text-slate-500 mt-1"><b>Symptoms:</b> {d.symptoms}</p>}
                            {d.treatment && <p className="text-xs text-slate-500"><b>Treatment:</b> {d.treatment}</p>}
                            {d.doctor    && <p className="text-xs text-slate-500 flex items-center gap-1"><UserCheck size={10}/>Dr. {d.doctor.name}</p>}
                            <span className={'text-xs px-2 py-0.5 rounded-full border mt-1 inline-block ' +
                              (d.status==='RESOLVED'?'bg-green-50 text-green-700 border-green-200':d.status==='CHRONIC'?'bg-amber-50 text-amber-700 border-amber-200':'bg-red-50 text-red-700 border-red-200')}>
                              {d.status}
                            </span>
                          </div>
                        )}

                        {event.type === 'VACCINATION' && (
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{d.vaccine_name}</p>
                            {d.disease_prevented && <p className="text-xs text-slate-500 mt-0.5">Prevents: {d.disease_prevented}</p>}
                            {d.dose             && <p className="text-xs text-slate-500">Dose: {d.dose}</p>}
                            {d.batch_number     && <p className="text-xs text-slate-400">Batch: {d.batch_number}</p>}
                            {d.next_due_at && (
                              <p className={'text-xs font-medium mt-1 ' + (d.next_due_at < today ? 'text-red-600' : 'text-blue-600')}>
                                Next due: {fmt(d.next_due_at)} {d.next_due_at < today ? '⚠️ OVERDUE' : ''}
                              </p>
                            )}
                            {d.administrator && <p className="text-xs text-slate-500 flex items-center gap-1"><UserCheck size={10}/>Dr. {d.administrator.name}</p>}
                          </div>
                        )}

                        {event.type === 'BILL' && (
                          <div>
                            <div className="flex items-center gap-2">
                              <code className="text-xs font-mono text-primary-600 font-semibold">{d.bill_number}</code>
                              <span className={'text-xs px-2 py-0.5 rounded-full border ' +
                                (d.status==='PAID'?'bg-green-50 text-green-700 border-green-200':d.status==='PENDING'?'bg-amber-50 text-amber-700 border-amber-200':'bg-red-50 text-red-600 border-red-200')}>
                                {d.status}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-slate-800 mt-0.5">₹{parseFloat(d.total_amount).toFixed(2)}</p>
                            {d.items?.length > 0 && (
                              <p className="text-xs text-slate-400 mt-0.5">{d.items.map(i=>i.item_name).slice(0,3).join(', ')}{d.items.length>3?` +${d.items.length-3} more`:''}</p>
                            )}
                            {d.hospital && <p className="text-xs text-slate-500 flex items-center gap-1"><Building2 size={10}/>{d.hospital.name}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── VISITS TAB ── */}
            {tab === 'visits' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {!appointments?.length ? (
                  <p className="text-center text-sm text-slate-400 py-10">No visit records</p>
                ) : appointments.map((a, i) => (
                  <div key={a.id} className={'px-4 py-3 border-b border-slate-50 last:border-0 ' + (i%2===0?'':'bg-slate-50/30')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">{a.type}</span>
                          {a.token_number && <span className="text-xs text-slate-400">Token #{a.token_number}</span>}
                          <span className={'text-xs px-2 py-0.5 rounded-full border ' + (STATUS_APPT[a.status]||'bg-slate-100 text-slate-500 border-slate-200')}>{a.status}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1">
                          <span className="text-xs text-slate-500 flex items-center gap-1"><CalendarDays size={10}/>{fmt(a.appointment_date)}{a.appointment_time?' · '+a.appointment_time:''}</span>
                          {a.hospital && <span className="text-xs text-slate-500 flex items-center gap-1"><Building2 size={10}/>{a.hospital.name}</span>}
                          {a.doctor   && <span className="text-xs text-slate-500 flex items-center gap-1"><UserCheck size={10}/>Dr. {a.doctor.name}</span>}
                        </div>
                        {a.chief_complaint && <p className="text-xs text-slate-400 mt-1 italic">"{a.chief_complaint}"</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── DISEASES TAB ── */}
            {tab === 'diseases' && (
              <div className="space-y-3">
                {!diseases?.length ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">No disease records</div>
                ) : diseases.map(d => (
                  <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between">
                      <p className="font-semibold text-slate-800">{d.disease_name}</p>
                      <span className={'text-xs px-2 py-0.5 rounded-full border ' +
                        (d.status==='RESOLVED'?'bg-green-50 text-green-700 border-green-200':d.status==='CHRONIC'?'bg-amber-50 text-amber-700 border-amber-200':'bg-red-50 text-red-700 border-red-200')}>
                        {d.status}
                      </span>
                    </div>
                    {d.symptoms  && <p className="text-xs text-slate-500 mt-2"><span className="font-semibold">Symptoms:</span> {d.symptoms}</p>}
                    {d.diagnosis && <p className="text-xs text-slate-500 mt-1"><span className="font-semibold">Diagnosis:</span> {d.diagnosis}</p>}
                    {d.treatment && <p className="text-xs text-slate-500 mt-1"><span className="font-semibold">Treatment:</span> {d.treatment}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      {d.diagnosed_at && <span><CalendarDays size={10} className="inline mr-1"/>{fmt(d.diagnosed_at)}</span>}
                      {d.doctor       && <span><UserCheck size={10} className="inline mr-1"/>Dr. {d.doctor.name}</span>}
                      {d.resolved_at  && <span className="text-green-600">Resolved: {fmt(d.resolved_at)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── VACCINATIONS TAB ── */}
            {tab === 'vaccinations' && (
              <div className="space-y-3">
                {!vaccinations?.length ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">No vaccination records</div>
                ) : vaccinations.map(v => {
                  const isOverdue = v.next_due_at && v.next_due_at < today
                  return (
                    <div key={v.id} className={'bg-white rounded-2xl border p-4 ' + (isOverdue?'border-red-200':'border-slate-200')}>
                      <div className="flex items-start justify-between">
                        <p className="font-semibold text-slate-800">{v.vaccine_name}</p>
                        {v.next_due_at && (
                          <span className={'text-xs px-2 py-0.5 rounded-full border font-medium ' +
                            (isOverdue?'bg-red-50 text-red-700 border-red-200':'bg-blue-50 text-blue-700 border-blue-200')}>
                            {isOverdue?'⚠️ OVERDUE':'Due '+fmt(v.next_due_at)}
                          </span>
                        )}
                      </div>
                      {v.disease_prevented && <p className="text-xs text-slate-500 mt-1">Prevents: {v.disease_prevented}</p>}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                        <span><Syringe size={10} className="inline mr-1"/>Given: {fmt(v.vaccinated_at)}</span>
                        {v.dose         && <span>Dose: {v.dose}</span>}
                        {v.batch_number && <span>Batch: {v.batch_number}</span>}
                        {v.administrator && <span><UserCheck size={10} className="inline mr-1"/>Dr. {v.administrator.name}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── BILLING TAB ── */}
            {tab === 'billing' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
                    <div className="text-xl font-display font-bold text-slate-800">{bills?.length||0}</div>
                    <div className="text-xs text-slate-400">Total Bills</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
                    <div className="text-xl font-display font-bold text-green-700">₹{parseFloat(stats.totalRevenue||0).toLocaleString('en-IN')}</div>
                    <div className="text-xs text-slate-400">Total Paid</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {!bills?.length ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">No billing records</div>
                  ) : bills.map(b => (
                    <div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <code className="text-xs font-mono text-primary-600 font-semibold">{b.bill_number}</code>
                          <span className="text-xs text-slate-400 ml-2">{b.bill_type} · {fmt(b.bill_date)}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-800">₹{parseFloat(b.total_amount).toFixed(2)}</p>
                          <span className={'text-xs px-2 py-0.5 rounded-full border ' +
                            (b.status==='PAID'?'bg-green-50 text-green-700 border-green-200':b.status==='PENDING'?'bg-amber-50 text-amber-700 border-amber-200':'bg-red-50 text-red-600 border-red-200')}>
                            {b.status}
                          </span>
                        </div>
                      </div>
                      {b.items?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {b.items.map(it => (
                            <div key={it.id} className="flex justify-between text-xs text-slate-500">
                              <span>{it.item_name} × {it.quantity}</span>
                              <span>₹{parseFloat(it.amount).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {b.hospital && <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><Building2 size={10}/>{b.hospital.name}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}

          </div>
        )}
      </div>
    </div>
  )
}
