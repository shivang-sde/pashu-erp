import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Search, RefreshCw, X, Filter, Download, Printer,
  ChevronLeft, ChevronRight, CalendarDays,
  Clock, AlertTriangle, CheckCircle2,
  UserCheck, Pencil, Trash2, MoreHorizontal, Stethoscope,
} from 'lucide-react'
import { appointmentApi }   from '../../api/appointments.js'
import PrescriptionModal      from '../../components/prescription/PrescriptionModal.jsx'
import { AppointmentModal } from '../../components/appointment/AppointmentModal.jsx'
import { ConfirmDialog }    from '../../components/hospital/ConfirmDialog.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { useAuth } from '../../hooks/useAuth.jsx'
import * as XLSX from 'xlsx'

const ANIMAL_EMOJIS = { COW:'🐄', BUFFALO:'🐃', GOAT:'🐐', DOG:'🐕', CAMEL:'🐪', HORSE:'🐎', SHEEP:'🐑', OTHER:'🐾' }

const STATUS_CONFIG = {
  PENDING:     { label:'Pending',     color:'bg-amber-50 text-amber-700 border-amber-200',   dot:'bg-amber-400' },
  CONFIRMED:   { label:'Confirmed',   color:'bg-blue-50 text-blue-700 border-blue-200',      dot:'bg-blue-400' },
  IN_PROGRESS: { label:'In Progress', color:'bg-purple-50 text-purple-700 border-purple-200',dot:'bg-purple-400' },
  COMPLETED:   { label:'Completed',   color:'bg-green-50 text-green-700 border-green-200',   dot:'bg-green-400' },
  CANCELLED:   { label:'Cancelled',   color:'bg-red-50 text-red-600 border-red-200',         dot:'bg-red-400' },
  NO_SHOW:     { label:'No Show',     color:'bg-slate-100 text-slate-500 border-slate-200',  dot:'bg-slate-400' },
}

const TYPE_CONFIG = {
  REGULAR:     { label:'Regular',     color:'bg-blue-50 text-blue-700 border-blue-200' },
  EMERGENCY:   { label:'🚨 Emergency',color:'bg-red-50 text-red-700 border-red-200' },
  FOLLOW_UP:   { label:'Follow-up',   color:'bg-purple-50 text-purple-700 border-purple-200' },
  VACCINATION: { label:'Vaccination', color:'bg-green-50 text-green-700 border-green-200' },
}

function Badge({ config, children }) {
  return <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${config?.color||'bg-slate-100 text-slate-600 border-slate-200'}`}>{children||config?.label}</span>
}

function Stat({ icon: Icon, label, value, color }) {
  const colors = { blue:'text-blue-600 bg-blue-50', green:'text-green-600 bg-green-50', amber:'text-amber-600 bg-amber-50', red:'text-red-600 bg-red-50' }
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]||colors.blue}`}><Icon size={18}/></div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-display font-bold text-slate-800">{value ?? 0}</p>
      </div>
    </div>
  )
}

// ── Quick status update dropdown ─────────────────────────────
function StatusMenu({ appt, onUpdate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const NEXT = { PENDING:['CONFIRMED','CANCELLED','NO_SHOW'], CONFIRMED:['IN_PROGRESS','CANCELLED','NO_SHOW'], IN_PROGRESS:['COMPLETED','CANCELLED'], COMPLETED:[], CANCELLED:[], NO_SHOW:[] }
  const nextStatuses = NEXT[appt.status] || []
  if (!nextStatuses.length) return null

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o=>!o)}
        className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
        <MoreHorizontal size={14}/>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-card-hover overflow-hidden w-40 animate-fade-up">
          <p className="text-xs font-semibold text-slate-400 px-3 py-2 border-b border-slate-100">Update status</p>
          {nextStatuses.map(s => (
            <button key={s} type="button"
              onClick={() => { onUpdate(appt.id, s); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 transition-colors flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s]?.dot}`}/>
              {STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function AppointmentsPage() {
  const { getUser } = useAuth()
  const user = getUser()
  const canWrite  = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','RECEPTIONIST'].includes(user?.role)
  const canDelete = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN'].includes(user?.role)

  const [data,    setData]    = useState({ appointments:[], pagination:{ total:0,page:1,pages:1 } })
  const [statsData,setStatsData]= useState(null)
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [quickFilter, setQuickFilter] = useState('today') // today|upcoming|previous|all

  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType,   setFilterType]   = useState('')
  const [filterDate,   setFilterDate]   = useState(new Date().toISOString().split('T')[0])
  const [filterDateTo, setFilterDateTo] = useState('')
  const [exporting,    setExporting]    = useState(false)
  const [printing,     setPrinting]     = useState(false)
  const [showFilters,  setShowFilters]  = useState(false)

  const [modalOpen,    setModalOpen]    = useState(false)
  const [editData,     setEditData]     = useState(null)
  const [deleteTarget, setDeleteTarget]   = useState(null)
  const [rxAppt,       setRxAppt]         = useState(null)  // appointment to prescribe for
  const [deleting,     setDeleting]     = useState(false)
  const [toast,        setToast]        = useState(null)

  const searchTimer = useRef(null)

  const fetchStats = useCallback(async () => {
    try { const r = await appointmentApi.stats(); setStatsData(r.data.data) } catch {}
  }, [])

  const fetchData = useCallback(async (pg=page) => {
    setLoading(true)
    try {
      const td = new Date().toISOString().split('T')[0]
      let qDate = '', qDateTo = ''
      if (quickFilter === 'today')    { qDate = td; qDateTo = td }
      if (quickFilter === 'upcoming') { qDate = new Date(Date.now()+86400000).toISOString().split('T')[0] }
      if (quickFilter === 'previous') { qDateTo = new Date(Date.now()-86400000).toISOString().split('T')[0] }
      const res = await appointmentApi.list({
        page:pg, limit:10, search,
        status:   filterStatus,
        type:     filterType,
        date:     filterDate    || qDate,
        date_to:  filterDateTo  || qDateTo,
      })
      setData(res.data.data)
    } catch { showToast('Failed to load appointments','error') }
    finally { setLoading(false) }
  }, [page, search, filterStatus, filterType, filterDate, filterDateTo, quickFilter])

  useEffect(() => { fetchStats() }, [])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setPage(1); fetchData(1) }, 350)
    return () => clearTimeout(searchTimer.current)
  }, [search, filterStatus, filterType, filterDate, filterDateTo, quickFilter])

  useEffect(() => { fetchData(page) }, [page])


  function showToast(msg, type='success') {
    setToast({ message:msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function onSaved() {
    showToast(editData ? 'Appointment updated' : 'Appointment booked')
    fetchData(page); fetchStats()
      }

  async function handleStatusUpdate(id, status) {
    try {
      await appointmentApi.updateStatus(id, { status })
      showToast(`Status updated to ${STATUS_CONFIG[status]?.label}`)
      fetchData(page); fetchStats()
          } catch (err) { showToast(err?.response?.data?.message||'Failed to update','error') }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await appointmentApi.remove(deleteTarget.id)
      showToast('Appointment deleted')
      setDeleteTarget(null)
      fetchData(page); fetchStats()
    } catch (err) { showToast(err?.response?.data?.message||'Failed to delete','error'); setDeleteTarget(null) }
    finally { setDeleting(false) }
  }

  const { appointments, pagination } = data
  const totalCount = pagination?.total || 0
  const totalPages = pagination?.pages || 1

  const displayList = appointments


  async function handleExport() {
    setExporting(true)
    try {
      const res = await appointmentApi.list({ page:1, limit:2000, search, status:filterStatus, type:filterType, date:filterDate, date_to:filterDateTo })
      const all = res.data.data.appointments || []
      const rows = [
        ['Token','Date','Time','Type','Animal Type','Breed','Animal Name','Ear Tag','Owner','Phone','Village','Hospital','Doctor','Chief Complaint','Status'],
        ...all.map(a => [
          a.type==='EMERGENCY' ? 'EMERGENCY' : ('#'+(a.token_number||'')),
          a.appointment_date,
          a.appointment_time || '—',
          a.type,
          a.animal?.animal_type || '—',
          a.animal?.breed || '—',
          a.animal?.name || '—',
          a.animal?.ear_tag || '—',
          a.owner?.name || '—',
          a.owner?.phone || '—',
          a.owner?.village || '—',
          a.hospital?.name || '—',
          a.doctor ? 'Dr. '+a.doctor.name : 'Not assigned',
          a.chief_complaint || '—',
          a.status,
        ])
      ]
      const ws = XLSX.utils.aoa_to_sheet(rows)
      ws['!cols'] = [10,12,10,12,14,12,12,12,22,14,14,22,22,28,14].map(w=>({wch:w}))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Appointments')
      const label = filterDate ? '_' + filterDate + (filterDateTo ? '_to_'+filterDateTo : '') : ''
      XLSX.writeFile(wb, 'appointments' + label + '.xlsx')
      showToast('Exported ' + all.length + ' appointments')
    } catch { showToast('Export failed','error') }
    finally { setExporting(false) }
  }

  async function handlePrint() {
    setPrinting(true)
    try {
      const res = await appointmentApi.list({ page:1, limit:2000, search, status:filterStatus, type:filterType, date:filterDate, date_to:filterDateTo })
      const all = res.data.data.appointments || []
      const dateLabel = filterDate ? filterDate + (filterDateTo ? ' to ' + filterDateTo : '') : 'All Dates'
      const today = new Date().toLocaleString('en-IN')

      const STATUS_COLORS = { COMPLETED:'#dcfce7', PENDING:'#fef3c7', IN_PROGRESS:'#dbeafe', CANCELLED:'#fee2e2', CONFIRMED:'#d1fae5', NO_SHOW:'#f1f5f9' }
      const html = `<!DOCTYPE html><html><head>
      <title>Appointments — ${dateLabel}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:10.5px;color:#1a1a1a;padding:18px}
        .header{border-bottom:3px solid #1d4ed8;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between}
        .title{font-size:18px;font-weight:bold;color:#1d4ed8}
        .sub{font-size:10px;color:#64748b;margin-top:3px}
        .stats{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:12px}
        .stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center}
        .stat-val{font-size:15px;font-weight:bold;color:#1d4ed8}
        .stat-lbl{font-size:9px;color:#64748b;margin-top:1px}
        table{width:100%;border-collapse:collapse;font-size:9.5px}
        th{background:#1d4ed8;color:white;padding:5px 6px;text-align:left;white-space:nowrap}
        td{padding:4px 6px;border-bottom:1px solid #f1f5f9;vertical-align:top}
        .emg{background:#fff1f2!important}
        .tok{font-weight:bold;color:#1d4ed8}
        .footer{text-align:center;margin-top:14px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}
        @media print{@page{margin:.7cm;size:A4 landscape}.stat-val{font-size:13px}}
      </style></head><body>
      <div class="header">
        <div>
          <div class="title">🐾 PashuCare — Appointment List</div>
          <div class="sub">Date: ${dateLabel}${filterStatus?' | Status: '+filterStatus:''}${filterType?' | Type: '+filterType:''}</div>
        </div>
        <div style="font-size:9px;color:#94a3b8;text-align:right">Printed: ${today}<br/>Total: ${all.length} appointments</div>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-val">${all.length}</div><div class="stat-lbl">Total</div></div>
        <div class="stat"><div class="stat-val">${all.filter(a=>a.status==='COMPLETED').length}</div><div class="stat-lbl">Completed</div></div>
        <div class="stat"><div class="stat-val">${all.filter(a=>a.status==='PENDING').length}</div><div class="stat-lbl">Pending</div></div>
        <div class="stat"><div class="stat-val" style="color:#dc2626">${all.filter(a=>a.type==='EMERGENCY').length}</div><div class="stat-lbl">Emergency</div></div>
        <div class="stat"><div class="stat-val">${all.filter(a=>a.status==='CANCELLED').length}</div><div class="stat-lbl">Cancelled</div></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Token</th><th>Date</th><th>Time</th><th>Animal</th><th>Owner</th><th>Phone</th><th>Village</th><th>Hospital</th><th>Doctor</th><th>Type</th><th>Chief Complaint</th><th>Status</th></tr></thead>
        <tbody>
          ${all.map((a,i)=>`<tr class="${a.type==='EMERGENCY'?'emg':''}">
            <td>${i+1}</td>
            <td class="tok">${a.type==='EMERGENCY'?'🚨 EMG':('#'+(a.token_number||'?'))}</td>
            <td>${a.appointment_date}</td>
            <td>${a.appointment_time||'—'}</td>
            <td>${a.animal?.animal_type||'—'}${a.animal?.breed?' · '+a.animal.breed:''}${a.animal?.name?' "'+a.animal.name+'"':''}</td>
            <td>${a.owner?.name||'—'}</td>
            <td>${a.owner?.phone||'—'}</td>
            <td>${a.owner?.village||'—'}</td>
            <td>${a.hospital?.name||'—'}</td>
            <td>${a.doctor?'Dr. '+a.doctor.name:'Not assigned'}</td>
            <td>${a.type}</td>
            <td style="max-width:120px;white-space:normal">${a.chief_complaint||'—'}</td>
            <td style="background:${STATUS_COLORS[a.status]||'#f1f5f9'};font-weight:bold;font-size:8.5px">${a.status}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="footer">PashuCare ERP · Appointment List · ${dateLabel} · Printed: ${today}</div>
      </body></html>`

      const w = window.open('', '_blank', 'width=1100,height=750')
      w.document.write(html)
      w.document.close()
      w.onload = () => setTimeout(() => { w.print(); setPrinting(false) }, 300)
    } catch { showToast('Print failed','error'); setPrinting(false) }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in
          ${toast.type==='error'?'bg-red-600 text-white':'bg-green-600 text-white'}`}>
          {toast.message}<button onClick={()=>setToast(null)}><X size={14}/></button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Appointments</h1>
          <p className="text-sm text-slate-500 mt-1">{totalCount} total appointments</p>
        </div>
        {canWrite && (
          <Button icon={Plus} onClick={() => { setEditData(null); setModalOpen(true) }}>Book Appointment</Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={CalendarDays}  label="Today"     value={statsData?.todayTotal} color="blue"/>
        <Stat icon={Clock}         label="Pending"   value={statsData?.pending}    color="amber"/>
        <Stat icon={CheckCircle2}  label="Completed" value={statsData?.completed}  color="green"/>
        <Stat icon={AlertTriangle} label="Emergency Today" value={statsData?.emergency} color="red"/>
      </div>

      {/* View toggle + filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Quick filters */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 flex-shrink-0 flex-wrap">
            {[
              { id:'today',    label:"📅 Today",    color:'blue'   },
              { id:'upcoming', label:"🔜 Upcoming",  color:'green'  },
              { id:'previous', label:"🕐 Previous",  color:'slate'  },
              { id:'all',      label:"☰ All",        color:'slate'  },
            ].map(tab => (
              <button key={tab.id} onClick={() => { setQuickFilter(tab.id); setFilterDate(''); setFilterDateTo(''); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
                  ${quickFilter===tab.id ? 'bg-white shadow-card text-slate-700 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <>
              <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Search size={15} className="text-slate-400 flex-shrink-0"/>
                <input type="text" placeholder="Search animal, owner…"
                  value={search} onChange={e=>setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm placeholder:text-slate-400 outline-none font-body text-slate-700"/>
                {search && <button onClick={()=>setSearch('')}><X size={14} className="text-slate-400"/></button>}
              </div>
              <button onClick={()=>setShowFilters(f=>!f)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors
                  ${showFilters||filterStatus||filterType||filterDate||filterDateTo?'bg-primary-50 border-primary-200 text-primary-700':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Filter size={15}/> Filters {(filterStatus||filterType||filterDate||filterDateTo)&&<span className="w-1.5 h-1.5 rounded-full bg-primary-600"/>}
              </button>
          </>

          <button onClick={() => fetchData(page)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <RefreshCw size={15} className={loading?'animate-spin':''}/> Refresh
          </button>
          <button onClick={handlePrint} disabled={printing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors">
            <Printer size={15}/>{printing?'Preparing…':'Print'}
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-200 bg-green-50 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors">
            <Download size={15}/>{exporting?'Exporting…':'Export'}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100 animate-fade-in">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Date From</label>
              <input type="date" value={filterDate} onChange={e=>{setFilterDate(e.target.value);setPage(1)}} className="input-base h-9 text-sm w-36"/>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Date To</label>
              <input type="date" value={filterDateTo} onChange={e=>{setFilterDateTo(e.target.value);setPage(1)}} className="input-base h-9 text-sm w-36" min={filterDate}/>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Status</label>
              <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1)}} className="input-base h-9 text-sm w-36">
                <option value="">All</option>
                {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Type</label>
              <select value={filterType} onChange={e=>{setFilterType(e.target.value);setPage(1)}} className="input-base h-9 text-sm w-36">
                <option value="">All</option>
                {Object.entries(TYPE_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            {(filterStatus||filterType||filterDate) && (
              <div className="flex flex-col justify-end">
                <button onClick={()=>{setFilterStatus('');setFilterType('');setFilterDate('');setFilterDateTo('');setPage(1)}}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium">
                  <X size={12}/> Clear
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Token', 'Animal / Owner', 'Hospital / Doctor', 'Date & Time', 'Type', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:5}).map((_,i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({length:7}).map((_,j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-20"/></td>
                    ))}
                  </tr>
                ))
              ) : !displayList.length ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    <CalendarDays size={32} className="mx-auto mb-3 text-slate-300"/>
                    <p className="font-medium text-slate-500">"No appointments found"</p>
                    <p className="text-xs mt-1">{canWrite ? 'Book an appointment to get started' : 'Check back later'}</p>
                  </td>
                </tr>
              ) : displayList.map(a => (
                <tr key={a.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors group
                  ${a.type==='EMERGENCY' ? 'bg-red-50/30' : ''}`}>

                  {/* Token */}
                  <td className="px-4 py-3">
                    {a.type === 'EMERGENCY' ? (
                      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                        <AlertTriangle size={16} className="text-red-600"/>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <span className="font-display font-bold text-slate-700 text-sm">#{a.token_number}</span>
                      </div>
                    )}
                  </td>

                  {/* Animal + Owner */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{ANIMAL_EMOJIS[a.animal?.animal_type]||'🐾'}</span>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">
                          {a.animal?.animal_type}{a.animal?.breed?` · ${a.animal.breed}`:''}
                          {a.animal?.name?` "${a.animal.name}"`:''}
                        </p>
                        <p className="text-xs text-slate-400">{a.owner?.name} · {a.owner?.phone}</p>
                      </div>
                    </div>
                  </td>

                  {/* Hospital + Doctor */}
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700 font-medium">{a.hospital?.name}</p>
                    {a.doctor ? (
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <UserCheck size={10}/> Dr. {a.doctor.name}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-500 mt-0.5">Doctor not assigned</p>
                    )}
                  </td>

                  {/* Date & Time */}
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">{new Date(a.appointment_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
                    {a.appointment_time && <p className="text-xs text-slate-400 mt-0.5">⏰ {a.appointment_time}</p>}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3"><Badge config={TYPE_CONFIG[a.type]}/></td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_CONFIG[a.status]?.dot}`}/>
                      <Badge config={STATUS_CONFIG[a.status]}/>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {/* Add Prescription — always visible */}
                      {['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR'].includes(user?.role) && (
                        <button onClick={() => setRxAppt(a)}
                          title="Add / View Prescription"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 text-xs font-semibold transition-colors whitespace-nowrap">
                          <Stethoscope size={12}/> Rx
                        </button>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <StatusMenu appt={a} onUpdate={handleStatusUpdate}/>
                        {canWrite && (
                          <button onClick={() => { setEditData(a); setModalOpen(true) }}
                            className="w-8 h-8 rounded-lg hover:bg-primary-50 flex items-center justify-center text-slate-400 hover:text-primary-600 transition-colors">
                            <Pencil size={14}/>
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setDeleteTarget(a)}
                            className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 size={14}/>
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">Showing {((pagination.page-1)*10)+1}–{Math.min(pagination.page*10,totalCount)} of {totalCount}</span>
            <div className="flex items-center gap-2">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50"><ChevronLeft size={14}/></button>
              <span className="text-sm font-medium text-slate-600 px-2">{page} / {totalPages}</span>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50"><ChevronRight size={14}/></button>
            </div>
          </div>
        )}
      </div>

      <PrescriptionModal
        open={!!rxAppt}
        onClose={() => setRxAppt(null)}
        onSaved={() => { showToast('Prescription saved!'); setRxAppt(null) }}
        prefill={rxAppt ? {
          animal_id:       rxAppt.animal_id,
          owner_id:        rxAppt.owner_id,
          appointment_id:  rxAppt.id,
          hospital_id:     rxAppt.hospital_id,
          chief_complaint: rxAppt.chief_complaint || '',
          animal:          rxAppt.animal,
          owner:           rxAppt.owner,
        } : null}
      />

      <AppointmentModal
        open={modalOpen} onClose={()=>setModalOpen(false)}
        onSaved={onSaved} editData={editData}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Appointment"
        message={`Delete appointment #${deleteTarget?.token_number||''}? This cannot be undone.`}
        onConfirm={handleDelete} onCancel={()=>setDeleteTarget(null)} loading={deleting}
      />
    </div>
  )
}
