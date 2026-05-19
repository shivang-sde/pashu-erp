import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Search, RefreshCw, Pencil, Trash2, BarChart2, Download, Printer,
  Stethoscope, Building2, Mail, X, Filter,
  ChevronLeft, ChevronRight, CheckCircle2, Hash,
} from 'lucide-react'
import { doctorApi }   from '../../api/doctors.js'
import { hospitalApi } from '../../api/hospitals.js'
import { DoctorModal }        from '../../components/doctor/DoctorModal.jsx'
import { DoctorProfileDrawer } from '../../components/doctor/DoctorProfileDrawer.jsx'
import { ConfirmDialog } from '../../components/hospital/ConfirmDialog.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { useAuth } from '../../hooks/useAuth.jsx'
import * as XLSX from 'xlsx'

const SPEC_COLORS = [
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-pink-50 text-pink-700 border-pink-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-red-50 text-red-700 border-red-200',
  'bg-teal-50 text-teal-700 border-teal-200',
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-orange-50 text-orange-700 border-orange-200',
  'bg-green-50 text-green-700 border-green-200',
]

function hashStr(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % SPEC_COLORS.length
  return h
}

function SpecTags({ specs }) {
  if (!specs || !specs.length) return <span className="text-slate-400 text-xs">—</span>
  const list = Array.isArray(specs) ? specs : (typeof specs === 'string' ? JSON.parse(specs) : [])
  if (!list.length) return <span className="text-slate-400 text-xs">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {list.slice(0, 2).map(s => (
        <span key={s} className={`text-xs font-medium px-1.5 py-0.5 rounded-md border ${SPEC_COLORS[hashStr(s)]}`}>{s}</span>
      ))}
      {list.length > 2 && (
        <span className="text-xs font-medium px-1.5 py-0.5 rounded-md border bg-slate-100 text-slate-500 border-slate-200">+{list.length - 2}</span>
      )}
    </div>
  )
}

function HospitalTags({ hospitals }) {
  if (!hospitals?.length) return <span className="text-slate-400 text-xs">Not assigned</span>
  return (
    <div className="flex flex-col gap-0.5">
      {hospitals.slice(0, 2).map(h => (
        <div key={h.id} className="flex items-center gap-1 text-xs text-slate-600">
          <Building2 size={10} className="text-slate-400 flex-shrink-0"/>
          <span className="truncate max-w-[140px]">{h.name}</span>
          {h.DoctorHospital?.is_primary && (
            <span className="text-green-600 font-semibold">★</span>
          )}
        </div>
      ))}
      {hospitals.length > 2 && (
        <span className="text-xs text-slate-400">+{hospitals.length - 2} more</span>
      )}
    </div>
  )
}

function Badge({ children, color = 'gray' }) {
  const map = {
    green:'bg-green-50 text-green-700 border-green-200',
    red:'bg-red-50 text-red-700 border-red-200',
    amber:'bg-amber-50 text-amber-700 border-amber-200',
    gray:'bg-slate-100 text-slate-600 border-slate-200',
  }
  return <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${map[color]||map.gray}`}>{children}</span>
}

function Avatar({ name }) {
  const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'DR'
  return (
    <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-bold text-green-700">{initials}</span>
    </div>
  )
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

// ════════════════════════════════════════════════════════════
export default function DoctorsPage() {
  const { getUser } = useAuth()
  const user = getUser()
  const canWrite  = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN'].includes(user?.role)
  const canDelete = ['STATE_ADMIN','DISTRICT_ADMIN'].includes(user?.role)

  const [data,    setData]    = useState({ doctors: [], pagination: { total:0, page:1, pages:1 } })
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)

  const [search,       setSearch]       = useState('')
  const [status,       setStatus]       = useState('')
  const [filterSpec,    setFilterSpec]    = useState('')
  const [filterState,   setFilterState]   = useState('')
  const [filterDistrict,setFilterDistrict] = useState('')
  const [allDistricts,  setAllDistricts]  = useState([])
  const [statesList,    setStatesList]    = useState([])
  const [filteredDists, setFilteredDists] = useState([])
  const [showFilters,   setShowFilters]   = useState(false)

  const [modalOpen,    setModalOpen]    = useState(false)
  const [editData,     setEditData]     = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [profileId,    setProfileId]    = useState(null)
  const [deleting,     setDeleting]     = useState(false)
  const [exporting,    setExporting]    = useState(false)
  const [printing,     setPrinting]     = useState(false)
  const [toast,        setToast]        = useState(null)

  const searchTimer = useRef(null)

  useEffect(() => {
    hospitalApi.getAllDistricts()
      .then(r => {
        const list = r.data.data || []
        setAllDistricts(list)
        setStatesList([...new Set(list.map(d => d.state).filter(Boolean))].sort())
      }).catch(() => {})
  }, [])

  useEffect(() => {
    setFilteredDists(filterState ? allDistricts.filter(d => d.state === filterState) : [])
    setFilterDistrict('')
  }, [filterState, allDistricts])

  const fetchData = useCallback(async (pg = page) => {
    setLoading(true)
    try {
      const res = await doctorApi.list({ page: pg, limit: 10, search, status, specialization: filterSpec, state: filterState, district_id: filterDistrict })
      setData(res.data.data)
    } catch {
      showToast('Failed to load doctors', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, search, status, filterSpec, filterState, filterDistrict])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setPage(1); fetchData(1) }, 350)
    return () => clearTimeout(searchTimer.current)
  }, [search, status, filterSpec, filterState, filterDistrict])

  useEffect(() => { fetchData(page) }, [page])

  function showToast(msg, type = 'success') {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function onSaved() {
    showToast(editData ? 'Doctor updated' : 'Doctor added successfully')
    fetchData(page)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await doctorApi.remove(deleteTarget.id)
      showToast('Doctor deleted')
      setDeleteTarget(null)
      fetchData(page)
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to delete', 'error')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const { doctors, pagination } = data
  const totalCount  = pagination?.total || 0
  const totalPages  = pagination?.pages || 1
  const activeCount = doctors.filter(d => d.status === 'ACTIVE').length


  async function handleExport() {
    setExporting(true)
    try {
      const res = await doctorApi.list({ page:1, limit:2000, search, status, specialization:filterSpec, state:filterState, district_id:filterDistrict })
      const all = res.data.data.doctors || []

      const rows = [
        ['Name','Email','Registration No.','Specializations','Hospitals','Status','Last Login','Joined'],
        ...all.map(d => {
          const specs = Array.isArray(d.specializations) ? d.specializations.join(', ') : (d.specializations||'—')
          const hosps = d.assignedHospitals?.map(h=>h.name).join(', ') || d.hospital?.name || '—'
          return [
            'Dr. '+d.name, d.email,
            d.registration_number||'—', specs, hosps, d.status,
            d.last_login ? new Date(d.last_login).toLocaleDateString('en-IN') : 'Never',
            d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN') : '—',
          ]
        })
      ]
      const ws = XLSX.utils.aoa_to_sheet(rows)
      ws['!cols'] = [22,28,18,30,30,10,16,14].map(w=>({wch:w}))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Doctors')

      // Summary sheet
      const specMap = {}
      all.forEach(d => {
        const specs = Array.isArray(d.specializations) ? d.specializations : []
        specs.forEach(s => { specMap[s] = (specMap[s]||0)+1 })
      })
      const sumRows = [
        ['Doctors List Export'],
        ['Total Doctors', all.length],
        ['Active', all.filter(d=>d.status==='ACTIVE').length],
        ['Inactive', all.filter(d=>d.status==='INACTIVE').length],
        ['With Registration No.', all.filter(d=>d.registration_number).length],
        [],['Top Specializations'],['Specialization','Count'],
        ...Object.entries(specMap).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([k,v])=>[k,v]),
      ]
      const wsSum = XLSX.utils.aoa_to_sheet(sumRows)
      wsSum['!cols'] = [{wch:28},{wch:12}]
      XLSX.utils.book_append_sheet(wb, wsSum, 'Summary')

      XLSX.writeFile(wb, 'doctors_list_' + new Date().toISOString().split('T')[0] + '.xlsx')
      showToast('Exported ' + all.length + ' doctors')
    } catch { showToast('Export failed','error') }
    finally { setExporting(false) }
  }

  async function handlePrint() {
    setPrinting(true)
    try {
      const res = await doctorApi.list({ page:1, limit:2000, search, status, specialization:filterSpec, state:filterState, district_id:filterDistrict })
      const all = res.data.data.doctors || []
      const now = new Date().toLocaleString('en-IN')
      const active = all.filter(d=>d.status==='ACTIVE').length

      // Build specialization frequency map
      const specMap = {}
      all.forEach(d => {
        const specs = Array.isArray(d.specializations) ? d.specializations : []
        specs.forEach(s => { specMap[s] = (specMap[s]||0)+1 })
      })
      const topSpecs = Object.entries(specMap).sort((a,b)=>b[1]-a[1]).slice(0,8)

      const html = `<!DOCTYPE html><html><head>
      <title>Doctors List</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:10.5px;color:#1a1a1a;padding:18px}
        .header{border-bottom:3px solid #15803d;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between}
        .title{font-size:18px;font-weight:bold;color:#15803d}
        .sub{font-size:10px;color:#64748b;margin-top:3px}
        .stats{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px}
        .stat{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px;text-align:center}
        .stat-val{font-size:15px;font-weight:bold;color:#15803d}
        .stat-lbl{font-size:9px;color:#166534;margin-top:1px}
        .grid2{display:grid;grid-template-columns:3fr 1fr;gap:14px;margin-bottom:14px}
        table{width:100%;border-collapse:collapse;font-size:9.5px}
        th{background:#15803d;color:white;padding:5px 7px;text-align:left;white-space:nowrap}
        td{padding:4px 7px;border-bottom:1px solid #f1f5f9;vertical-align:top}
        tr:nth-child(even){background:#f8fafc}
        .active{color:#15803d;font-weight:bold}.inactive{color:#6b7280}.suspended{color:#dc2626}
        .spec{display:inline-block;background:#fef9c3;color:#854d0e;border:1px solid #fde047;border-radius:99px;padding:1px 6px;font-size:8px;margin:1px}
        .summary-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px}
        .summary-title{font-weight:bold;color:#15803d;margin-bottom:6px;font-size:10px}
        .summary-row{display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #dcfce7;font-size:9.5px}
        .footer{text-align:center;margin-top:14px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}
        @media print{@page{margin:.8cm;size:A4 landscape}}
      </style></head><body>

      <div class="header">
        <div>
          <div class="title">👨‍⚕️ PashuCare — Doctors Directory</div>
          <div class="sub">${status?'Status: '+status+' | ':''}${filterSpec?'Specialization: '+filterSpec+' | ':''}${search?'Search: "'+search+'" | ':''} Total: ${all.length} doctors</div>
        </div>
        <div style="font-size:9px;color:#94a3b8;text-align:right">Printed: ${now}</div>
      </div>

      <div class="stats">
        <div class="stat"><div class="stat-val">${all.length}</div><div class="stat-lbl">Total Doctors</div></div>
        <div class="stat"><div class="stat-val">${active}</div><div class="stat-lbl">Active</div></div>
        <div class="stat"><div class="stat-val">${all.length-active}</div><div class="stat-lbl">Inactive</div></div>
        <div class="stat"><div class="stat-val">${all.filter(d=>d.registration_number).length}</div><div class="stat-lbl">Registered</div></div>
        <div class="stat"><div class="stat-val">${Object.keys(specMap).length}</div><div class="stat-lbl">Specializations</div></div>
      </div>

      <div class="grid2">
        <div>
          <table>
            <thead><tr><th>#</th><th>Name</th><th>Registration No.</th><th>Specializations</th><th>Hospitals</th><th>Email</th><th>Last Login</th><th>Status</th></tr></thead>
            <tbody>
              ${all.map((d,i)=>{
                const specs = Array.isArray(d.specializations) ? d.specializations : []
                const hosps = d.assignedHospitals?.map(h=>h.name).join(', ') || d.hospital?.name || '—'
                return `<tr>
                  <td>${i+1}</td>
                  <td><b>Dr. ${d.name}</b><br/><span style="color:#94a3b8;font-size:8.5px">${d.email}</span></td>
                  <td>${d.registration_number||'—'}</td>
                  <td>${specs.map(s=>`<span class="spec">${s}</span>`).join('')||'—'}</td>
                  <td style="font-size:8.5px">${hosps}</td>
                  <td style="font-size:8.5px">${d.email}</td>
                  <td>${d.last_login?new Date(d.last_login).toLocaleDateString('en-IN'):'Never'}</td>
                  <td class="${d.status.toLowerCase()}">${d.status}</td>
                </tr>`
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="summary-box">
          <div class="summary-title">Top Specializations</div>
          ${topSpecs.map(([s,n])=>`<div class="summary-row"><span>${s}</span><b>${n}</b></div>`).join('')}
        </div>
      </div>

      <div class="footer">PashuCare ERP · Doctors Directory · Printed: ${now}</div>
      </body></html>`

      const w = window.open('', '_blank', 'width=1200,height=750')
      w.document.write(html)
      w.document.close()
      w.onload = () => setTimeout(() => { w.print(); setPrinting(false) }, 300)
    } catch { showToast('Print failed','error'); setPrinting(false) }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {toast.message}<button onClick={() => setToast(null)}><X size={14}/></button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Doctor Management</h1>
          <p className="text-sm text-slate-500 mt-1">{totalCount} doctors registered</p>
        </div>
        {canWrite && (
          <Button icon={Plus} onClick={() => { setEditData(null); setModalOpen(true) }}>Add Doctor</Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Stethoscope} label="Total Doctors" value={totalCount}  color="green"/>
        <Stat icon={CheckCircle2} label="Active"       value={activeCount} color="blue"/>
        <Stat icon={Building2}    label="On this page" value={doctors.length} color="amber"/>
        <Stat icon={Hash}         label="With Reg. No" value={doctors.filter(d => d.registration_number).length} color="green"/>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Search size={15} className="text-slate-400 flex-shrink-0"/>
            <input type="text" placeholder="Search by name, email, registration no…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none font-body"/>
            {search && <button onClick={() => setSearch('')}><X size={14} className="text-slate-400 hover:text-slate-600"/></button>}
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors
              ${showFilters||status||filterSpec||filterState||filterDistrict ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Filter size={15}/> Filters {(status||filterSpec||filterState||filterDistrict) && <span className="w-1.5 h-1.5 rounded-full bg-primary-600"/>}
          </button>
          <button onClick={() => fetchData(page)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw size={15} className={loading?'animate-spin':''}/> Refresh
          </button>
          <button onClick={handlePrint} disabled={printing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors">
            <Printer size={15}/>{printing ? 'Preparing…' : 'Print List'}
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-200 bg-green-50 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors">
            <Download size={15}/>{exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100 animate-fade-in">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Status</label>
              <select value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}} className="input-base h-9 text-sm w-36">
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">State</label>
              <select value={filterState} onChange={e=>{setFilterState(e.target.value);setPage(1)}} className="input-base h-9 text-sm w-44">
                <option value="">All States</option>
                {statesList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">District</label>
              <select value={filterDistrict} onChange={e=>{setFilterDistrict(e.target.value);setPage(1)}}
                disabled={!filterState} className={'input-base h-9 text-sm w-44' + (!filterState?' opacity-50':'')}>
                <option value="">{filterState ? 'All Districts' : 'Select state first'}</option>
                {filteredDists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Specialization</label>
              <input type="text" placeholder="e.g. Surgery"
                value={filterSpec} onChange={e=>{setFilterSpec(e.target.value);setPage(1)}}
                className="input-base h-9 text-sm w-40"/>
            </div>
            {(status||filterSpec||filterState||filterDistrict) && (
              <div className="flex flex-col justify-end">
                <button onClick={()=>{setStatus('');setFilterSpec('');setFilterState('');setFilterDistrict('');setPage(1)}}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium">
                  <X size={12}/> Clear all
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
                {['Doctor', 'Reg. No.', 'Specializations', 'Hospitals', 'Status', canWrite?'Actions':''].filter(Boolean).map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:5}).map((_,i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({length:canWrite?6:5}).map((_,j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-24"/></td>
                    ))}
                  </tr>
                ))
              ) : !doctors.length ? (
                <tr>
                  <td colSpan={canWrite?6:5} className="text-center py-16 text-slate-400">
                    <Stethoscope size={32} className="mx-auto mb-3 text-slate-300"/>
                    <p className="font-medium text-slate-500">No doctors found</p>
                    <p className="text-xs mt-1">{search||status||filterSpec ? 'Try adjusting filters' : 'Add a doctor to get started'}</p>
                  </td>
                </tr>
              ) : doctors.map(d => {
                const specs = Array.isArray(d.specializations) ? d.specializations
                  : (d.specializations ? (() => { try { return JSON.parse(d.specializations) } catch { return [d.specializations] } })() : [])
                return (
                  <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={d.name}/>
                        <div>
                          <div className="font-semibold text-slate-800">{d.name}</div>
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                            <Mail size={10}/><span className="truncate max-w-[150px]">{d.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {d.registration_number
                        ? <code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{d.registration_number}</code>
                        : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3"><SpecTags specs={specs}/></td>
                    <td className="px-4 py-3"><HospitalTags hospitals={d.assignedHospitals}/></td>
                    <td className="px-4 py-3">
                      <Badge color={d.status==='ACTIVE'?'green':d.status==='SUSPENDED'?'red':'amber'}>{d.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setProfileId(d.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold border border-green-200 transition-colors whitespace-nowrap">
                        <BarChart2 size={13}/> Profile
                      </button>
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditData(d); setModalOpen(true) }}
                            className="w-8 h-8 rounded-lg hover:bg-primary-50 flex items-center justify-center text-slate-400 hover:text-primary-600 transition-colors">
                            <Pencil size={14}/>
                          </button>
                          {canDelete && (
                            <button onClick={() => setDeleteTarget(d)}
                              className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 size={14}/>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing {((pagination.page-1)*10)+1}–{Math.min(pagination.page*10, totalCount)} of {totalCount}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50">
                <ChevronLeft size={14}/>
              </button>
              <span className="text-sm font-medium text-slate-600 px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50">
                <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        )}
      </div>

      <DoctorProfileDrawer
        doctorId={profileId} open={!!profileId} onClose={() => setProfileId(null)}
      />

      <DoctorModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={onSaved} editData={editData}/>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Doctor"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  )
}
