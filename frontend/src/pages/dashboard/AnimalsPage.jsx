import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Search, RefreshCw, Pencil, Trash2, Eye, History, Download, Printer,
  PawPrint, X, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { animalApi }  from '../../api/animals.js'
import { hospitalApi } from '../../api/hospitals.js'
import { AnimalModal }       from '../../components/animal/AnimalModal.jsx'
import { AnimalDetailDrawer }from '../../components/animal/AnimalDetailDrawer.jsx'
import { AnimalHistoryDrawer }from '../../components/animal/AnimalHistoryDrawer.jsx'
import { ConfirmDialog }     from '../../components/hospital/ConfirmDialog.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { useAuth } from '../../hooks/useAuth.jsx'
import * as XLSX from 'xlsx'

const ANIMAL_TYPES = ['COW','BUFFALO','GOAT','DOG','CAMEL','HORSE','SHEEP','OTHER']
const ANIMAL_EMOJIS = { COW:'🐄', BUFFALO:'🐃', GOAT:'🐐', DOG:'🐕', CAMEL:'🐪', HORSE:'🐎', SHEEP:'🐑', OTHER:'🐾' }

const TYPE_COLORS = {
  COW:     'bg-amber-50 text-amber-700 border-amber-200',
  BUFFALO: 'bg-slate-100 text-slate-700 border-slate-300',
  GOAT:    'bg-green-50 text-green-700 border-green-200',
  DOG:     'bg-orange-50 text-orange-700 border-orange-200',
  CAMEL:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  HORSE:   'bg-brown-50 text-red-700 border-red-200',
  SHEEP:   'bg-blue-50 text-blue-700 border-blue-200',
  OTHER:   'bg-purple-50 text-purple-700 border-purple-200',
}

function Stat({ emoji, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
      <div className="text-2xl">{emoji}</div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-display font-bold text-slate-800">{value ?? 0}</p>
      </div>
    </div>
  )
}

function Badge({ children, color='gray' }) {
  const map = { green:'bg-green-50 text-green-700 border-green-200', red:'bg-red-50 text-red-700 border-red-200', amber:'bg-amber-50 text-amber-700 border-amber-200', gray:'bg-slate-100 text-slate-600 border-slate-200' }
  return <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${map[color]||map.gray}`}>{children}</span>
}

// ════════════════════════════════════════════════════════════
export default function AnimalsPage() {
  const { getUser } = useAuth()
  const user = getUser()
  const canWrite  = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','RECEPTIONIST'].includes(user?.role)
  const canDelete = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN'].includes(user?.role)

  const [data,      setData]      = useState({ animals:[], pagination:{ total:0,page:1,pages:1 } })
  const [loading,   setLoading]   = useState(true)
  const [page,      setPage]      = useState(1)
  const [hospitals, setHospitals] = useState([])

  const [search,      setSearch]      = useState('')
  const [filterType,  setFilterType]  = useState('')
  const [filterStatus,setFilterStatus]= useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo,   setFilterDateTo]   = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [exporting,   setExporting]   = useState(false)
  const [printing,    setPrinting]    = useState(false)

  const [modalOpen,    setModalOpen]    = useState(false)
  const [editData,     setEditData]     = useState(null)
  const [detailId,     setDetailId]     = useState(null)
  const [historyId,    setHistoryId]    = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,     setDeleting]     = useState(false)
  const [toast,        setToast]        = useState(null)

  const searchTimer = useRef(null)

  useEffect(() => {
    hospitalApi.list({ limit:100 }).then(r => setHospitals(r.data.data.hospitals)).catch(()=>{})
  }, [])

  const fetchData = useCallback(async (pg=page) => {
    setLoading(true)
    try {
      const res = await animalApi.list({ page:pg, limit:10, search, animal_type:filterType, status:filterStatus, date_from:filterDateFrom, date_to:filterDateTo })
      setData(res.data.data)
    } catch { showToast('Failed to load animals','error') }
    finally { setLoading(false) }
  }, [page, search, filterType, filterStatus, filterDateFrom, filterDateTo])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setPage(1); fetchData(1) }, 350)
    return () => clearTimeout(searchTimer.current)
  }, [search, filterType, filterStatus, filterDateFrom, filterDateTo])

  useEffect(() => { fetchData(page) }, [page])

  function showToast(msg, type='success') {
    setToast({ message:msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function onSaved() { showToast(editData ? 'Animal updated' : 'Animal registered'); fetchData(page) }

  async function handleDelete() {
    setDeleting(true)
    try {
      await animalApi.remove(deleteTarget.id)
      showToast('Animal record deleted')
      setDeleteTarget(null)
      fetchData(page)
    } catch (err) {
      showToast(err?.response?.data?.message||'Failed to delete','error')
      setDeleteTarget(null)
    } finally { setDeleting(false) }
  }

  const { animals, pagination } = data
  const totalCount = pagination?.total || 0
  const totalPages = pagination?.pages || 1

  // Count by type for stats
  const typeCounts = {}
  ANIMAL_TYPES.forEach(t => { typeCounts[t] = animals.filter(a => a.animal_type === t).length })


  async function handleExport() {
    setExporting(true)
    try {
      const res = await animalApi.list({ page:1, limit:5000, search, animal_type:filterType, status:filterStatus, date_from:filterDateFrom, date_to:filterDateTo })
      const all = res.data.data.animals || []
      const rows = [
        ['Registration Date','Animal Type','Breed','Name','Gender','Age (Yrs)','Age (Months)','Weight (kg)','Color','Ear Tag','RFID','Status',
         'Owner Name','Owner Phone','Owner Village','Owner Address','Hospital'],
        ...all.map(a => [
          a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN') : '—',
          a.animal_type, a.breed||'—', a.name||'—', a.gender||'—',
          a.age_years??'—', a.age_months??'—', a.weight_kg??'—',
          a.color||'—', a.ear_tag||'—', a.rfid||'—', a.status,
          a.owner?.name||'—', a.owner?.phone||'—',
          a.owner?.village||'—', a.owner?.address||'—',
          a.hospital?.name||'—',
        ])
      ]
      const ws = XLSX.utils.aoa_to_sheet(rows)
      ws['!cols'] = [14,14,14,12,10,10,12,12,12,12,12,10,22,14,16,22,22].map(w=>({wch:w}))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Animals')

      // Summary sheet
      const typeSummary = {}
      all.forEach(a => { typeSummary[a.animal_type] = (typeSummary[a.animal_type]||0)+1 })
      const sumRows = [
        ['Animal Patient Export Summary'],
        ['Date From', filterDateFrom||'All'], ['Date To', filterDateTo||'All'],
        ['Total Animals', all.length],
        [],['Animal Type Breakdown'],['Type','Count'],
        ...Object.entries(typeSummary).sort((a,b)=>b[1]-a[1]).map(([k,v])=>[k,v]),
        [],['Status Breakdown'],['Status','Count'],
        ...['ACTIVE','DECEASED','TRANSFERRED'].map(s=>[s, all.filter(a=>a.status===s).length]),
      ]
      const wsSum = XLSX.utils.aoa_to_sheet(sumRows)
      wsSum['!cols'] = [{wch:22},{wch:16}]
      XLSX.utils.book_append_sheet(wb, wsSum, 'Summary')

      const label = filterDateFrom ? '_' + filterDateFrom + (filterDateTo ? '_to_'+filterDateTo : '') : ''
      XLSX.writeFile(wb, 'animal_patients' + label + '.xlsx')
      showToast('Exported ' + all.length + ' animals')
    } catch { showToast('Export failed','error') }
    finally { setExporting(false) }
  }

  async function handlePrint() {
    setPrinting(true)
    try {
      const res = await animalApi.list({ page:1, limit:5000, search, animal_type:filterType, status:filterStatus, date_from:filterDateFrom, date_to:filterDateTo })
      const all  = res.data.data.animals || []
      const now  = new Date().toLocaleString('en-IN')
      const dateLabel = filterDateFrom ? filterDateFrom + (filterDateTo ? ' to '+filterDateTo : '') : 'All Dates'

      // Count stats
      const byType = {}
      all.forEach(a => { byType[a.animal_type]=(byType[a.animal_type]||0)+1 })
      const active    = all.filter(a=>a.status==='ACTIVE').length
      const deceased  = all.filter(a=>a.status==='DECEASED').length

      const html = `<!DOCTYPE html><html><head>
      <title>Animal Patients — ${dateLabel}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:10px;color:#1a1a1a;padding:16px}
        .header{border-bottom:3px solid #b45309;padding-bottom:10px;margin-bottom:12px;display:flex;justify-content:space-between}
        .title{font-size:17px;font-weight:bold;color:#b45309}
        .sub{font-size:9.5px;color:#64748b;margin-top:3px}
        .stats{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:12px}
        .stat{background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:6px;text-align:center}
        .stat-val{font-size:14px;font-weight:bold;color:#b45309}
        .stat-lbl{font-size:8.5px;color:#92400e;margin-top:1px}
        .type-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px}
        .type-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px;text-align:center;font-size:9.5px}
        .type-val{font-size:13px;font-weight:bold;color:#1d4ed8}
        table{width:100%;border-collapse:collapse;font-size:9px}
        th{background:#b45309;color:white;padding:5px 6px;text-align:left;white-space:nowrap}
        td{padding:3.5px 6px;border-bottom:1px solid #f1f5f9;vertical-align:top}
        .active{color:#15803d;font-weight:bold}.deceased{color:#dc2626}.transferred{color:#7c3aed}
        .footer{text-align:center;margin-top:12px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}
        @media print{@page{margin:.7cm;size:A4 landscape}}
      </style></head><body>
      <div class="header">
        <div>
          <div class="title">🐾 PashuCare — Animal Patient Registry</div>
          <div class="sub">Registration Period: ${dateLabel}${filterType?' | Type: '+filterType:''}${filterStatus?' | Status: '+filterStatus:''}</div>
        </div>
        <div style="font-size:9px;color:#94a3b8;text-align:right">Printed: ${now}<br/>Total: ${all.length} animals</div>
      </div>

      <div class="stats">
        <div class="stat"><div class="stat-val">${all.length}</div><div class="stat-lbl">Total</div></div>
        <div class="stat"><div class="stat-val" style="color:#15803d">${active}</div><div class="stat-lbl">Active</div></div>
        <div class="stat"><div class="stat-val" style="color:#dc2626">${deceased}</div><div class="stat-lbl">Deceased</div></div>
        <div class="stat"><div class="stat-val">${byType['COW']||0}</div><div class="stat-lbl">Cows 🐄</div></div>
        <div class="stat"><div class="stat-val">${byType['BUFFALO']||0}</div><div class="stat-lbl">Buffalo 🐃</div></div>
        <div class="stat"><div class="stat-val">${(byType['GOAT']||0)+(byType['SHEEP']||0)}</div><div class="stat-lbl">Goat/Sheep 🐐</div></div>
      </div>

      <table>
        <thead><tr><th>#</th><th>Reg. Date</th><th>Type</th><th>Breed</th><th>Name</th><th>Gender</th><th>Age</th><th>Weight</th><th>Ear Tag</th><th>Owner</th><th>Phone</th><th>Village</th><th>Hospital</th><th>Status</th></tr></thead>
        <tbody>
          ${all.map((a,i)=>`<tr>
            <td>${i+1}</td>
            <td>${a.created_at?new Date(a.created_at).toLocaleDateString('en-IN'):'—'}</td>
            <td><b>${a.animal_type}</b></td>
            <td>${a.breed||'—'}</td>
            <td>${a.name?'"'+a.name+'"':'—'}</td>
            <td>${a.gender||'—'}</td>
            <td>${a.age_years?a.age_years+'y ':''  }${a.age_months?a.age_months+'m':''||'—'}</td>
            <td>${a.weight_kg?a.weight_kg+' kg':'—'}</td>
            <td>${a.ear_tag||'—'}</td>
            <td>${a.owner?.name||'—'}</td>
            <td>${a.owner?.phone||'—'}</td>
            <td>${a.owner?.village||'—'}</td>
            <td>${a.hospital?.name||'—'}</td>
            <td class="${a.status.toLowerCase()}">${a.status}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="footer">PashuCare ERP · Animal Patient Registry · ${dateLabel} · Printed: ${now}</div>
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
          ${toast.type==='error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {toast.message}<button onClick={()=>setToast(null)}><X size={14}/></button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Animal Patients</h1>
          <p className="text-sm text-slate-500 mt-1">{totalCount} animals registered</p>
        </div>
        {canWrite && (
          <Button icon={Plus} onClick={() => { setEditData(null); setModalOpen(true) }}>Register Animal</Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat emoji="🐾" label="Total Animals" value={totalCount}/>
        <Stat emoji="🐄" label="Cattle (Cow+Buffalo)" value={(typeCounts['COW']||0)+(typeCounts['BUFFALO']||0)}/>
        <Stat emoji="🐐" label="Small Animals" value={(typeCounts['GOAT']||0)+(typeCounts['SHEEP']||0)+(typeCounts['DOG']||0)}/>
        <Stat emoji="🐪" label="Large Animals" value={(typeCounts['HORSE']||0)+(typeCounts['CAMEL']||0)}/>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Search size={15} className="text-slate-400 flex-shrink-0"/>
            <input type="text" placeholder="Search by name, breed, ear tag, owner name/phone…"
              value={search} onChange={e=>setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none font-body"/>
            {search && <button onClick={()=>setSearch('')}><X size={14} className="text-slate-400 hover:text-slate-600"/></button>}
          </div>
          <button onClick={()=>setShowFilters(f=>!f)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors
              ${showFilters||filterType||filterStatus ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Filter size={15}/> Filters {(filterType||filterStatus||filterDateFrom||filterDateTo) && <span className="w-1.5 h-1.5 rounded-full bg-primary-600"/>}
          </button>
          <button onClick={()=>fetchData(page)}
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
              <label className="text-xs font-medium text-slate-500">Animal Type</label>
              <select value={filterType} onChange={e=>{setFilterType(e.target.value);setPage(1)}} className="input-base h-9 text-sm w-36">
                <option value="">All types</option>
                {ANIMAL_TYPES.map(t => <option key={t} value={t}>{ANIMAL_EMOJIS[t]} {t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Status</label>
              <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1)}} className="input-base h-9 text-sm w-36">
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="DECEASED">Deceased</option>
                <option value="TRANSFERRED">Transferred</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Registered From</label>
              <input type="date" value={filterDateFrom} onChange={e=>{setFilterDateFrom(e.target.value);setPage(1)}} className="input-base h-9 text-sm w-36"/>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Registered To</label>
              <input type="date" value={filterDateTo} onChange={e=>{setFilterDateTo(e.target.value);setPage(1)}} className="input-base h-9 text-sm w-36" min={filterDateFrom}/>
            </div>
            {(filterType||filterStatus||filterDateFrom||filterDateTo) && (
              <div className="flex flex-col justify-end">
                <button onClick={()=>{setFilterType('');setFilterStatus('');setFilterDateFrom('');setFilterDateTo('');setPage(1)}}
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
                {['Animal', 'Breed / Tags', 'Owner', 'Hospital', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:5}).map((_,i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({length:6}).map((_,j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-24"/></td>
                    ))}
                  </tr>
                ))
              ) : !animals.length ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    <PawPrint size={32} className="mx-auto mb-3 text-slate-300"/>
                    <p className="font-medium text-slate-500">No animals found</p>
                    <p className="text-xs mt-1">{search||filterType||filterStatus ? 'Try adjusting filters' : 'Register an animal to get started'}</p>
                  </td>
                </tr>
              ) : animals.map(a => (
                <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl flex-shrink-0">{ANIMAL_EMOJIS[a.animal_type]||'🐾'}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${TYPE_COLORS[a.animal_type]||'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {a.animal_type}
                          </span>
                          {a.name && <span className="text-sm font-medium text-slate-700">"{a.name}"</span>}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {a.gender !== 'UNKNOWN' && a.gender} {a.age_years ? `· ${a.age_years}y` : ''} {a.weight_kg ? `· ${a.weight_kg}kg` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-700">{a.breed || <span className="text-slate-400">—</span>}</div>
                    {a.ear_tag  && <div className="text-xs text-slate-400 mt-0.5">🏷️ {a.ear_tag}</div>}
                    {a.rfid_tag && <div className="text-xs text-slate-400">📡 {a.rfid_tag}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-700">{a.owner?.name || '—'}</div>
                    {a.owner?.phone   && <div className="text-xs text-slate-400 mt-0.5">📞 {a.owner.phone}</div>}
                    {a.owner?.village && <div className="text-xs text-slate-400">📍 {a.owner.village}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{a.hospital?.name || <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3">
                    <Badge color={a.status==='ACTIVE'?'green':a.status==='DECEASED'?'red':'amber'}>{a.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setHistoryId(a.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition-colors whitespace-nowrap">
                        <History size={13}/> History
                      </button>
                      <button onClick={() => setDetailId(a.id)}
                        className="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors" title="Quick view">
                        <Eye size={14}/>
                      </button>
                      {canWrite && (
                        <button onClick={() => { setEditData(a); setModalOpen(true) }}
                          className="w-8 h-8 rounded-lg hover:bg-primary-50 flex items-center justify-center text-slate-400 hover:text-primary-600 transition-colors" title="Edit">
                          <Pencil size={14}/>
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setDeleteTarget(a)}
                          className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 size={14}/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing {((pagination.page-1)*10)+1}–{Math.min(pagination.page*10,totalCount)} of {totalCount}
            </span>
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

      <AnimalModal
        open={modalOpen} onClose={()=>setModalOpen(false)}
        onSaved={onSaved} editData={editData} hospitals={hospitals}
      />
      <AnimalDetailDrawer
        animalId={detailId} open={!!detailId} onClose={()=>setDetailId(null)}
      />
      <AnimalHistoryDrawer
        animalId={historyId} open={!!historyId} onClose={()=>setHistoryId(null)}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Animal Record"
        message={`Delete this ${deleteTarget?.animal_type} record? All disease and vaccination history will also be removed.`}
        onConfirm={handleDelete} onCancel={()=>setDeleteTarget(null)} loading={deleting}
      />
    </div>
  )
}
