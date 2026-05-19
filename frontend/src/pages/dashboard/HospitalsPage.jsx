import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Search, RefreshCw, Pencil, Trash2, Eye, Download, Printer,
  Building2, MapPin, Phone, Mail, Users,
  ChevronLeft, ChevronRight, Filter, X,
} from 'lucide-react'
import { hospitalApi } from '../../api/hospitals.js'
import { HospitalModal }  from '../../components/hospital/HospitalModal.jsx'
import { HospitalDetailDrawer } from '../../components/hospital/HospitalDetailDrawer.jsx'
import { ConfirmDialog }  from '../../components/hospital/ConfirmDialog.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { useAuth } from '../../hooks/useAuth.jsx'
import * as XLSX from 'xlsx'

// ── helpers ──────────────────────────────────────────────────
function Badge({ children, color = 'gray' }) {
  const map = {
    green:  'bg-green-50 text-green-700 border-green-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    amber:  'bg-amber-50 text-amber-700 border-amber-200',
    gray:   'bg-slate-100 text-slate-600 border-slate-200',
  }
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${map[color]||map.gray}`}>
      {children}
    </span>
  )
}

function Stat({ icon: Icon, label, value, color }) {
  const colors = { blue:'text-blue-600 bg-blue-50', green:'text-green-600 bg-green-50', amber:'text-amber-600 bg-amber-50', purple:'text-purple-600 bg-purple-50' }
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]||colors.blue}`}>
        <Icon size={18}/>
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-display font-bold text-slate-800">{value ?? 0}</p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// HOSPITAL MANAGEMENT PAGE
// ════════════════════════════════════════════════════════════
export default function HospitalsPage() {
  const { getUser } = useAuth()
  const user = getUser()
  const canWrite = ['STATE_ADMIN', 'DISTRICT_ADMIN'].includes(user?.role)
  const canDelete = user?.role === 'STATE_ADMIN'

  const [data,    setData]    = useState({ hospitals: [], pagination: { total:0, page:1, pages:1 } })
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)

  // Filters
  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState('')
  const [type,    setType]    = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Modals
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editData,    setEditData]    = useState(null)
  const [deleteTarget,setDeleteTarget]= useState(null)
  const [deleting,    setDeleting]    = useState(false)
  const [detailId,    setDetailId]    = useState(null)
  const [exporting,   setExporting]   = useState(false)
  const [printing,    setPrinting]    = useState(false)
  const [toast,       setToast]       = useState(null)

  const searchTimer = useRef(null)

  const fetchData = useCallback(async (pg = page) => {
    setLoading(true)
    try {
      const res = await hospitalApi.list({ page: pg, limit: 10, search, status, type })
      setData(res.data.data)
    } catch (err) {
      showToast('Failed to load hospitals', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, search, status, type])

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setPage(1); fetchData(1) }, 350)
    return () => clearTimeout(searchTimer.current)
  }, [search, status, type])

  useEffect(() => { fetchData(page) }, [page])

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  function openAdd() { setEditData(null); setModalOpen(true) }
  function openEdit(h) { setEditData(h);   setModalOpen(true) }

  function onSaved() {
    showToast(editData ? 'Hospital updated successfully' : 'Hospital added successfully')
    fetchData(page)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await hospitalApi.remove(deleteTarget.id)
      showToast('Hospital deleted successfully')
      setDeleteTarget(null)
      fetchData(page)
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to delete hospital', 'error')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const { hospitals, pagination } = data
  const totalPages = pagination?.pages || 1
  const totalCount = pagination?.total || 0

  const activeCount   = hospitals.filter(h => h.status === 'ACTIVE').length
  const govtCount     = hospitals.filter(h => h.type   === 'GOVERNMENT').length
  const totalStaff    = hospitals.reduce((s, h) => s + (h.staffCount || 0), 0)


  async function handleExport() {
    setExporting(true)
    try {
      const res = await hospitalApi.list({ page:1, limit:2000, search, status, type })
      const all = res.data.data.hospitals || []

      const rows = [
        ['Hospital Name','Code','Type','District','Address','Phone','Email','Status','Established','Doctors (Est.)','Staff (Est.)'],
        ...all.map(h => [
          h.name, h.code, h.type||'—',
          h.district?.name||'—', h.address||'—',
          h.phone||'—', h.email||'—', h.status,
          h.established_year||'—',
          h.doctor_count||'—', h.staff_count||'—',
        ])
      ]
      const ws = XLSX.utils.aoa_to_sheet(rows)
      ws['!cols'] = [30,18,16,18,28,14,24,10,14,12,12].map(w=>({wch:w}))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Hospitals')

      // Summary sheet
      const byType = {}; const byStatus = {}; const byDistrict = {}
      all.forEach(h => {
        byType[h.type||'Unknown']   = (byType[h.type||'Unknown']||0)+1
        byStatus[h.status]          = (byStatus[h.status]||0)+1
        const d = h.district?.name||'Unknown'
        byDistrict[d]               = (byDistrict[d]||0)+1
      })
      const sumRows = [
        ['Hospital List Export'],['Total',all.length],[],
        ['By Status'],['Status','Count'],
        ...Object.entries(byStatus).map(([k,v])=>[k,v]),[],
        ['By Type'],['Type','Count'],
        ...Object.entries(byType).map(([k,v])=>[k,v]),[],
        ['By District'],['District','Count'],
        ...Object.entries(byDistrict).sort((a,b)=>b[1]-a[1]).map(([k,v])=>[k,v]),
      ]
      const wsSum = XLSX.utils.aoa_to_sheet(sumRows)
      wsSum['!cols'] = [{wch:28},{wch:12}]
      XLSX.utils.book_append_sheet(wb, wsSum, 'Summary')

      XLSX.writeFile(wb, 'hospitals_list_' + new Date().toISOString().split('T')[0] + '.xlsx')
      showToast('Exported ' + all.length + ' hospitals')
    } catch { showToast('Export failed','error') }
    finally { setExporting(false) }
  }

  async function handlePrint() {
    setPrinting(true)
    try {
      const res = await hospitalApi.list({ page:1, limit:2000, search, status, type })
      const all = res.data.data.hospitals || []
      const now = new Date().toLocaleString('en-IN')

      const byType = {}; const byDistrict = {}
      all.forEach(h => {
        byType[h.type||'Unknown'] = (byType[h.type||'Unknown']||0)+1
        const d = h.district?.name||'Unknown'
        byDistrict[d] = (byDistrict[d]||0)+1
      })
      const active = all.filter(h=>h.status==='ACTIVE').length

      const html = `<!DOCTYPE html><html><head>
      <title>Hospitals Directory</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:10.5px;color:#1a1a1a;padding:18px}
        .header{border-bottom:3px solid #1d4ed8;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between}
        .title{font-size:18px;font-weight:bold;color:#1d4ed8}
        .sub{font-size:10px;color:#64748b;margin-top:3px}
        .stats{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px}
        .stat{background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:8px;text-align:center}
        .stat-val{font-size:15px;font-weight:bold;color:#1d4ed8}
        .stat-lbl{font-size:9px;color:#1e40af;margin-top:1px}
        .grid2{display:grid;grid-template-columns:3fr 1fr;gap:14px}
        table{width:100%;border-collapse:collapse;font-size:9.5px}
        th{background:#1d4ed8;color:white;padding:5px 7px;text-align:left;white-space:nowrap}
        td{padding:4px 7px;border-bottom:1px solid #f1f5f9;vertical-align:top}
        tr:nth-child(even){background:#f8fafc}
        .active{color:#15803d;font-weight:bold}.inactive{color:#6b7280}.closed{color:#dc2626}
        .summary-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px}
        .summary-title{font-weight:bold;color:#1d4ed8;margin-bottom:6px;font-size:10px;text-transform:uppercase;letter-spacing:.03em}
        .summary-row{display:flex;justify-content:space-between;padding:2.5px 0;border-bottom:1px solid #dbeafe;font-size:9.5px}
        .footer{text-align:center;margin-top:14px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}
        @media print{@page{margin:.8cm;size:A4 landscape}}
      </style></head><body>

      <div class="header">
        <div>
          <div class="title">🏥 PashuCare — Hospitals Directory</div>
          <div class="sub">${status?'Status: '+status+' | ':''}${type?'Type: '+type+' | ':''}${search?'Search: "'+search+'" | ':''} Total: ${all.length} hospitals</div>
        </div>
        <div style="font-size:9px;color:#94a3b8;text-align:right">Printed: ${now}</div>
      </div>

      <div class="stats">
        <div class="stat"><div class="stat-val">${all.length}</div><div class="stat-lbl">Total</div></div>
        <div class="stat"><div class="stat-val">${active}</div><div class="stat-lbl">Active</div></div>
        <div class="stat"><div class="stat-val">${all.length-active}</div><div class="stat-lbl">Inactive/Closed</div></div>
        <div class="stat"><div class="stat-val">${Object.keys(byType).length}</div><div class="stat-lbl">Types</div></div>
        <div class="stat"><div class="stat-val">${Object.keys(byDistrict).length}</div><div class="stat-lbl">Districts</div></div>
      </div>

      <div class="grid2">
        <table>
          <thead><tr><th>#</th><th>Hospital Name</th><th>Code</th><th>Type</th><th>District</th><th>Phone</th><th>Address</th><th>Status</th></tr></thead>
          <tbody>
            ${all.map((h,i)=>`<tr>
              <td>${i+1}</td>
              <td><b>${h.name}</b></td>
              <td style="font-size:8.5px;color:#64748b">${h.code}</td>
              <td>${h.type||'—'}</td>
              <td>${h.district?.name||'—'}</td>
              <td>${h.phone||'—'}</td>
              <td style="font-size:8.5px">${h.address||'—'}</td>
              <td class="${h.status.toLowerCase()}">${h.status}</td>
            </tr>`).join('')}
          </tbody>
        </table>

        <div>
          <div class="summary-box" style="margin-bottom:10px">
            <div class="summary-title">By Type</div>
            ${Object.entries(byType).map(([k,v])=>`<div class="summary-row"><span>${k}</span><b>${v}</b></div>`).join('')}
          </div>
          <div class="summary-box">
            <div class="summary-title">By District</div>
            ${Object.entries(byDistrict).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="summary-row"><span>${k}</span><b>${v}</b></div>`).join('')}
          </div>
        </div>
      </div>

      <div class="footer">PashuCare ERP · Hospitals Directory · Printed: ${now}</div>
      </body></html>`

      const w = window.open('', '_blank', 'width=1200,height=750')
      w.document.write(html)
      w.document.close()
      w.onload = () => setTimeout(() => { w.print(); setPrinting(false) }, 300)
    } catch { showToast('Print failed','error'); setPrinting(false) }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {toast.message}
          <button onClick={() => setToast(null)}><X size={14}/></button>
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Hospital Management</h1>
          <p className="text-sm text-slate-500 mt-1">{totalCount} hospitals registered across all districts</p>
        </div>
        {canWrite && (
          <Button icon={Plus} onClick={openAdd}>Add Hospital</Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Building2} label="Total"    value={totalCount}  color="blue"/>
        <Stat icon={Building2} label="Active"   value={activeCount} color="green"/>
        <Stat icon={Building2} label="Govt"     value={govtCount}   color="amber"/>
        <Stat icon={Users}     label="Staff"    value={totalStaff}  color="purple"/>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Search size={15} className="text-slate-400 flex-shrink-0"/>
            <input type="text" placeholder="Search by name, code, address…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none font-body"/>
            {search && <button onClick={() => setSearch('')}><X size={14} className="text-slate-400 hover:text-slate-600"/></button>}
          </div>

          {/* Filter toggle */}
          <button onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors
              ${showFilters || status || type ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Filter size={15}/> Filters
            {(status || type) && <span className="w-1.5 h-1.5 rounded-full bg-primary-600"/>}
          </button>

          <button onClick={() => fetchData(page)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh
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

        {/* Expanded filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100 animate-fade-in">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Status</label>
              <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
                className="input-base h-9 text-sm w-36">
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Type</label>
              <select value={type} onChange={e => { setType(e.target.value); setPage(1) }}
                className="input-base h-9 text-sm w-36">
                <option value="">All types</option>
                <option value="GOVERNMENT">Government</option>
                <option value="PRIVATE">Private</option>
              </select>
            </div>
            {(status || type) && (
              <div className="flex flex-col justify-end">
                <button onClick={() => { setStatus(''); setType(''); setPage(1) }}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium">
                  <X size={12}/> Clear filters
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
                {['Hospital', 'Code', 'District', 'Contact', 'Type', 'Staff', 'Status', canWrite ? 'Actions' : ''].filter(Boolean).map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: canWrite ? 8 : 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-24"/>
                      </td>
                    ))}
                  </tr>
                ))
              ) : !hospitals.length ? (
                <tr>
                  <td colSpan={canWrite ? 8 : 7} className="text-center py-16 text-slate-400">
                    <Building2 size={32} className="mx-auto mb-3 text-slate-300"/>
                    <p className="font-medium text-slate-500">No hospitals found</p>
                    <p className="text-xs mt-1">
                      {search || status || type ? 'Try adjusting your filters' : 'Add a hospital to get started'}
                    </p>
                  </td>
                </tr>
              ) : hospitals.map(h => (
                <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <Building2 size={14} className="text-primary-600"/>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{h.name}</div>
                        {h.address && <div className="text-xs text-slate-400 mt-0.5 max-w-[200px] truncate">{h.address}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{h.code}</code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <MapPin size={12} className="text-slate-400 flex-shrink-0"/>
                      {h.district?.name || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {h.phone && <div className="flex items-center gap-1.5 text-xs text-slate-500"><Phone size={11}/>{h.phone}</div>}
                      {h.email && <div className="flex items-center gap-1.5 text-xs text-slate-500"><Mail size={11} className="flex-shrink-0"/><span className="truncate max-w-[140px]">{h.email}</span></div>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={h.type === 'GOVERNMENT' ? 'blue' : 'amber'}>
                      {h.type === 'GOVERNMENT' ? 'Govt' : 'Private'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Users size={13} className="text-slate-400"/>
                      {h.staffCount}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={h.status === 'ACTIVE' ? 'green' : 'red'}>{h.status}</Badge>
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setDetailId(h.id)}
                          className="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
                          title="View details">
                          <Eye size={14}/>
                        </button>
                        <button onClick={() => openEdit(h)}
                          className="w-8 h-8 rounded-lg hover:bg-primary-50 flex items-center justify-center text-slate-400 hover:text-primary-600 transition-colors"
                          title="Edit">
                          <Pencil size={14}/>
                        </button>
                        {canDelete && (
                          <button onClick={() => setDeleteTarget(h)}
                            className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete">
                            <Trash2 size={14}/>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing {((pagination.page - 1) * 10) + 1}–{Math.min(pagination.page * 10, totalCount)} of {totalCount}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 transition-colors">
                <ChevronLeft size={14}/>
              </button>
              <span className="text-sm text-slate-600 font-medium px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 transition-colors">
                <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        )}
      </div>

      <HospitalDetailDrawer
        hospitalId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
      />

      {/* Add/Edit Modal */}
      <HospitalModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onSaved}
        editData={editData}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Hospital"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  )
}
