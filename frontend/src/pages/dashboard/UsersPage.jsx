import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Search, RefreshCw, X, Filter, Download,
  ChevronLeft, ChevronRight, UserCog,
  Pencil, Trash2, KeyRound, ShieldCheck,
  Building2, MapPin, Mail,
} from 'lucide-react'
import { userApi } from '../../api/users.js'
import { UserModal }          from '../../components/users/UserModal.jsx'
import { ResetPasswordModal } from '../../components/users/ResetPasswordModal.jsx'
import { ConfirmDialog }      from '../../components/hospital/ConfirmDialog.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { useAuth } from '../../hooks/useAuth.jsx'
import * as XLSX from 'xlsx'

const ROLE_CONFIG = {
  STATE_ADMIN:    { label:'State Admin',    color:'bg-red-50 text-red-700 border-red-200',          icon:'🛡️' },
  DISTRICT_ADMIN: { label:'District Admin', color:'bg-purple-50 text-purple-700 border-purple-200', icon:'🏛️' },
  HOSPITAL_ADMIN: { label:'Hospital Admin', color:'bg-blue-50 text-blue-700 border-blue-200',       icon:'🏥' },
  DOCTOR:         { label:'Doctor',         color:'bg-green-50 text-green-700 border-green-200',    icon:'👨‍⚕️' },
  PHARMACIST:     { label:'Pharmacist',     color:'bg-amber-50 text-amber-700 border-amber-200',    icon:'💊' },
  RECEPTIONIST:   { label:'Receptionist',  color:'bg-teal-50 text-teal-700 border-teal-200',       icon:'📋' },
}

const STATUS_CONFIG = {
  ACTIVE:    { color:'bg-green-50 text-green-700 border-green-200',    dot:'bg-green-400' },
  INACTIVE:  { color:'bg-slate-100 text-slate-500 border-slate-200',   dot:'bg-slate-400' },
  SUSPENDED: { color:'bg-red-50 text-red-600 border-red-200',          dot:'bg-red-400' },
}

function Avatar({ name, role }) {
  const initials = name?.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()||'U'
  const colors = { STATE_ADMIN:'bg-red-100 text-red-700', DISTRICT_ADMIN:'bg-purple-100 text-purple-700', HOSPITAL_ADMIN:'bg-blue-100 text-blue-700', DOCTOR:'bg-green-100 text-green-700', PHARMACIST:'bg-amber-100 text-amber-700', RECEPTIONIST:'bg-teal-100 text-teal-700' }
  return (
    <div className={'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ' + (colors[role]||'bg-slate-100 text-slate-600')}>{initials}</div>
  )
}

function Stat({ icon, label, value, color }) {
  const colors = { blue:'text-blue-600 bg-blue-50', green:'text-green-600 bg-green-50', amber:'text-amber-600 bg-amber-50', purple:'text-purple-600 bg-purple-50', teal:'text-teal-600 bg-teal-50', red:'text-red-600 bg-red-50' }
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
      <div className={'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ' + (colors[color]||colors.blue)}>{icon}</div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-display font-bold text-slate-800">{value ?? 0}</p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function UsersPage() {
  const { getUser } = useAuth()
  const currentUser = getUser()

  const [data,    setData]    = useState({ users:[], pagination:{ total:0,page:1,pages:1 } })
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)

  const [search,       setSearch]       = useState('')
  const [filterRole,   setFilterRole]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showFilters,  setShowFilters]  = useState(false)

  const [userModal,     setUserModal]     = useState(false)
  const [editData,      setEditData]      = useState(null)
  const [resetTarget,   setResetTarget]   = useState(null)
  const [deleteTarget,  setDeleteTarget]  = useState(null)
  const [deleting,      setDeleting]      = useState(false)
  const [exporting,     setExporting]     = useState(false)
  const [toast,         setToast]         = useState(null)

  const searchTimer = useRef(null)

  function showToast(msg, type='success') {
    setToast({ message:msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchStats = () => {
    userApi.getStats().then(r => setStats(r.data.data)).catch(()=>{})
  }

  const fetchData = useCallback(async (pg=page) => {
    setLoading(true)
    try {
      const r = await userApi.list({ page:pg, limit:10, search, role:filterRole, status:filterStatus })
      setData(r.data.data)
    } catch { showToast('Failed to load users','error') }
    finally { setLoading(false) }
  }, [page, search, filterRole, filterStatus])

  useEffect(() => { fetchStats() }, [])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setPage(1); fetchData(1) }, 350)
    return () => clearTimeout(searchTimer.current)
  }, [search, filterRole, filterStatus])

  useEffect(() => { fetchData(page) }, [page])

  function onSaved() {
    showToast(editData ? 'User updated' : 'User created successfully')
    fetchData(page)
    fetchStats()
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await userApi.remove(deleteTarget.id)
      showToast('User deleted')
      setDeleteTarget(null)
      fetchData(page)
      fetchStats()
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to delete','error')
      setDeleteTarget(null)
    } finally { setDeleting(false) }
  }

  const { users, pagination } = data
  const totalCount = pagination?.total || 0
  const totalPages = pagination?.pages || 1

  // Visible roles in filter based on current user
  const filterableRoles = {
    STATE_ADMIN:    ['DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','PHARMACIST','RECEPTIONIST'],
    DISTRICT_ADMIN: ['HOSPITAL_ADMIN','DOCTOR','PHARMACIST','RECEPTIONIST'],
    HOSPITAL_ADMIN: ['DOCTOR','PHARMACIST','RECEPTIONIST'],
  }[currentUser?.role] || []


  async function handleExport() {
    setExporting(true)
    try {
      // Fetch all users matching current filters (no pagination)
      const r = await userApi.list({ page:1, limit:1000, search, role:filterRole, status:filterStatus })
      const all = r.data.data.users || []

      const rows = all.map(u => ({
        'Name':           u.name,
        'Email':          u.email,
        'Role':           ROLE_CONFIG[u.role]?.label || u.role,
        'Status':         u.status,
        'Hospital':       u.hospital?.name || '—',
        'District':       u.district?.name || '—',
        'Last Login':     u.last_login ? new Date(u.last_login).toLocaleString('en-IN') : 'Never',
        'Created At':     new Date(u.created_at).toLocaleDateString('en-IN'),
      }))

      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [
        { wch:25 },{ wch:30 },{ wch:18 },{ wch:12 },
        { wch:28 },{ wch:20 },{ wch:22 },{ wch:16 },
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Users')

      const date = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, 'pashucare_users_' + date + '.xlsx')
      showToast('Exported ' + rows.length + ' users to Excel')
    } catch {
      showToast('Export failed', 'error')
    } finally { setExporting(false) }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {toast && (
        <div className={'fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in ' + (toast.type==='error'?'bg-red-600 text-white':'bg-green-600 text-white')}>
          {toast.message}<button onClick={()=>setToast(null)}><X size={14}/></button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">{totalCount} users · Role-based access control</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Download} loading={exporting} onClick={handleExport}>Export Excel</Button>
          <Button icon={Plus} onClick={() => { setEditData(null); setUserModal(true) }}>Create User</Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {currentUser?.role === 'STATE_ADMIN' && <Stat icon="🏛️" label="Dist. Admins"  value={stats.DISTRICT_ADMIN} color="purple"/>}
          <Stat icon="🏥" label="Hosp. Admins" value={stats.HOSPITAL_ADMIN} color="blue"/>
          <Stat icon="👨‍⚕️" label="Doctors"     value={stats.DOCTOR}         color="green"/>
          <Stat icon="💊" label="Pharmacists"  value={stats.PHARMACIST}     color="amber"/>
          <Stat icon="📋" label="Receptionists"value={stats.RECEPTIONIST}   color="teal"/>
          <Stat icon="👥" label="Total"        value={stats.total}           color="blue"/>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Search size={15} className="text-slate-400 flex-shrink-0"/>
            <input type="text" placeholder="Search by name or email…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm placeholder:text-slate-400 outline-none font-body text-slate-700"/>
            {search && <button onClick={()=>setSearch('')}><X size={14} className="text-slate-400"/></button>}
          </div>
          <button onClick={()=>setShowFilters(f=>!f)}
            className={'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ' +
              (showFilters||filterRole||filterStatus?'bg-primary-50 border-primary-200 text-primary-700':'border-slate-200 text-slate-600 hover:bg-slate-50')}>
            <Filter size={15}/> Filters {(filterRole||filterStatus)&&<span className="w-1.5 h-1.5 rounded-full bg-primary-600"/>}
          </button>
          <button onClick={()=>fetchData(page)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <RefreshCw size={15} className={loading?'animate-spin':''}/> Refresh
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100 animate-fade-in">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Role</label>
              <select value={filterRole} onChange={e=>{setFilterRole(e.target.value);setPage(1)}} className="input-base h-9 text-sm w-40">
                <option value="">All roles</option>
                {filterableRoles.map(r => <option key={r} value={r}>{ROLE_CONFIG[r]?.label||r}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Status</label>
              <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1)}} className="input-base h-9 text-sm w-32">
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            {(filterRole||filterStatus) && (
              <div className="flex flex-col justify-end">
                <button onClick={()=>{setFilterRole('');setFilterStatus('');setPage(1)}} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"><X size={12}/>Clear</button>
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
                {['User','Role','Assigned To','Status','Last Login','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:5}).map((_,i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({length:6}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-24"/></td>)}
                  </tr>
                ))
              ) : !users.length ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    <UserCog size={32} className="mx-auto mb-3 text-slate-300"/>
                    <p className="font-medium text-slate-500">No users found</p>
                    <p className="text-xs mt-1">{search||filterRole ? 'Try adjusting filters' : 'Create a user to get started'}</p>
                  </td>
                </tr>
              ) : users.map(u => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} role={u.role}/>
                      <div>
                        <div className="font-semibold text-slate-800">{u.name}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <Mail size={10}/>{u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ' + (ROLE_CONFIG[u.role]?.color||'bg-slate-100 text-slate-600 border-slate-200')}>
                      {ROLE_CONFIG[u.role]?.icon} {ROLE_CONFIG[u.role]?.label||u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-600">
                      {u.hospital && <div className="flex items-center gap-1.5"><Building2 size={11} className="text-slate-400"/>{u.hospital.name}</div>}
                      {u.district && <div className="flex items-center gap-1.5 mt-0.5"><MapPin size={11} className="text-slate-400"/>{u.district.name}</div>}
                      {!u.hospital && !u.district && <span className="text-slate-400">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={'w-1.5 h-1.5 rounded-full ' + (STATUS_CONFIG[u.status]?.dot||'bg-slate-400')}/>
                      <span className={'text-xs font-medium px-2 py-0.5 rounded-full border ' + (STATUS_CONFIG[u.status]?.color||'bg-slate-100 text-slate-600 border-slate-200')}>
                        {u.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditData(u); setUserModal(true) }}
                        className="w-8 h-8 rounded-lg hover:bg-primary-50 flex items-center justify-center text-slate-400 hover:text-primary-600 transition-colors" title="Edit">
                        <Pencil size={14}/>
                      </button>
                      <button onClick={() => setResetTarget(u)}
                        className="w-8 h-8 rounded-lg hover:bg-amber-50 flex items-center justify-center text-slate-400 hover:text-amber-600 transition-colors" title="Reset password">
                        <KeyRound size={14}/>
                      </button>
                      {u.id !== currentUser?.id && (
                        <button onClick={() => setDeleteTarget(u)}
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
            <span className="text-xs text-slate-400">Showing {((pagination.page-1)*10)+1}–{Math.min(pagination.page*10,totalCount)} of {totalCount}</span>
            <div className="flex items-center gap-2">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50"><ChevronLeft size={14}/></button>
              <span className="text-sm font-medium text-slate-600 px-2">{page} / {totalPages}</span>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50"><ChevronRight size={14}/></button>
            </div>
          </div>
        )}
      </div>

      <UserModal open={userModal} onClose={()=>setUserModal(false)} onSaved={onSaved} editData={editData}/>
      <ResetPasswordModal open={!!resetTarget} onClose={()=>setResetTarget(null)} user={resetTarget}/>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete User"
        message={`Delete "${deleteTarget?.name}" (${ROLE_CONFIG[deleteTarget?.role]?.label})? This cannot be undone.`}
        onConfirm={handleDelete} onCancel={()=>setDeleteTarget(null)} loading={deleting}
      />
    </div>
  )
}
