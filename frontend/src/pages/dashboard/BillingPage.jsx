import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Search, RefreshCw, X, Filter,
  ChevronLeft, ChevronRight, ReceiptText,
  IndianRupee, Clock, CheckCircle2, TrendingUp, Eye,
} from 'lucide-react'
import { billingApi } from '../../api/billing.js'
import { CreateBillModal } from '../../components/billing/CreateBillModal.jsx'
import { BillDetailDrawer } from '../../components/billing/BillDetailDrawer.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { useAuth } from '../../hooks/useAuth.jsx'

const STATUS_CONFIG = {
  PENDING:        { label:'Pending',        color:'bg-amber-50 text-amber-700 border-amber-200',    dot:'bg-amber-400' },
  PAID:           { label:'Paid',           color:'bg-green-50 text-green-700 border-green-200',    dot:'bg-green-400' },
  PARTIALLY_PAID: { label:'Partial',        color:'bg-blue-50 text-blue-700 border-blue-200',       dot:'bg-blue-400' },
  CANCELLED:      { label:'Cancelled',      color:'bg-red-50 text-red-600 border-red-200',          dot:'bg-red-400' },
}

const BILL_TYPES = ['OPD','MEDICINE','SURGERY','LABORATORY','VACCINATION','OTHER']
const TYPE_COLORS = {
  OPD:'bg-blue-50 text-blue-700 border-blue-200',
  MEDICINE:'bg-amber-50 text-amber-700 border-amber-200',
  SURGERY:'bg-red-50 text-red-700 border-red-200',
  LABORATORY:'bg-purple-50 text-purple-700 border-purple-200',
  VACCINATION:'bg-green-50 text-green-700 border-green-200',
  OTHER:'bg-slate-100 text-slate-600 border-slate-200',
}

function Stat({ icon:Icon, label, value, color, prefix='' }) {
  const colors = { blue:'text-blue-600 bg-blue-50', green:'text-green-600 bg-green-50', amber:'text-amber-600 bg-amber-50', red:'text-red-600 bg-red-50' }
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
      <div className={'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ' + (colors[color]||colors.blue)}><Icon size={18}/></div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-display font-bold text-slate-800">{prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : (value ?? 0)}</p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function BillingPage() {
  const { getUser } = useAuth()
  const user = getUser()
  const canWrite = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','RECEPTIONIST'].includes(user?.role)
  const canPay   = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','RECEPTIONIST'].includes(user?.role)

  const [data,      setData]      = useState({ bills:[], pagination:{ total:0,page:1,pages:1 } })
  const [stats,     setStats]     = useState(null)
  const [hospitals, setHospitals] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [page,      setPage]      = useState(1)

  const [search,      setSearch]      = useState('')
  const [filterStatus,setFilterStatus]= useState('')
  const [filterType,  setFilterType]  = useState('')
  const [filterFrom,  setFilterFrom]  = useState('')
  const [filterTo,    setFilterTo]    = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [createModal, setCreateModal] = useState(false)
  const [detailId,    setDetailId]    = useState(null)
  const [toast,       setToast]       = useState(null)
  const searchTimer = useRef(null)

  function showToast(msg, type='success') {
    setToast({ message:msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    billingApi.getStats().then(r => setStats(r.data.data)).catch(()=>{})
    billingApi.getHospitals().then(r => setHospitals(r.data.data || [])).catch(()=>{})
  }, [])

  const fetchData = useCallback(async (pg=page) => {
    setLoading(true)
    try {
      const r = await billingApi.list({ page:pg, limit:10, search, status:filterStatus, type:filterType, date_from:filterFrom, date_to:filterTo })
      setData(r.data.data)
    } catch { showToast('Failed to load bills','error') }
    finally { setLoading(false) }
  }, [page, search, filterStatus, filterType, filterFrom, filterTo])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setPage(1); fetchData(1) }, 350)
    return () => clearTimeout(searchTimer.current)
  }, [search, filterStatus, filterType, filterFrom, filterTo])

  useEffect(() => { fetchData(page) }, [page])

  function onCreated() {
    showToast('Bill created successfully')
    fetchData(page)
    billingApi.getStats().then(r => setStats(r.data.data)).catch(()=>{})
  }

  function onPaid() {
    showToast('Payment recorded')
    fetchData(page)
    billingApi.getStats().then(r => setStats(r.data.data)).catch(()=>{})
  }

  const { bills, pagination } = data
  const totalCount = pagination?.total || 0
  const totalPages = pagination?.pages || 1

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
          <h1 className="font-display text-2xl font-bold text-slate-800">Billing & Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">{totalCount} total bills</p>
        </div>
        {canWrite && (
          <Button icon={Plus} onClick={() => setCreateModal(true)}>Create Bill</Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={ReceiptText}  label="Today's Bills"   value={stats?.todayBills}    color="blue"/>
        <Stat icon={Clock}        label="Pending"         value={stats?.pendingBills}  color="amber"/>
        <Stat icon={CheckCircle2} label="Total Bills"     value={stats?.totalBills}    color="green"/>
        <Stat icon={IndianRupee}  label="This Month Rev." value={stats?.monthRevenue} color="green" prefix="₹"/>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Search size={15} className="text-slate-400 flex-shrink-0"/>
            <input type="text" placeholder="Search bill no, owner name, phone…"
              value={search} onChange={e=>setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm placeholder:text-slate-400 outline-none font-body text-slate-700"/>
            {search && <button onClick={()=>setSearch('')}><X size={14} className="text-slate-400"/></button>}
          </div>
          <button onClick={()=>setShowFilters(f=>!f)}
            className={'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ' +
              (showFilters||filterStatus||filterType||filterFrom||filterTo?'bg-primary-50 border-primary-200 text-primary-700':'border-slate-200 text-slate-600 hover:bg-slate-50')}>
            <Filter size={15}/> Filters {(filterStatus||filterType||filterFrom||filterTo)&&<span className="w-1.5 h-1.5 rounded-full bg-primary-600"/>}
          </button>
          <button onClick={()=>fetchData(page)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <RefreshCw size={15} className={loading?'animate-spin':''}/> Refresh
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100 animate-fade-in">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Status</label>
              <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1)}} className="input-base h-9 text-sm w-36">
                <option value="">All</option>
                {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Bill Type</label>
              <select value={filterType} onChange={e=>{setFilterType(e.target.value);setPage(1)}} className="input-base h-9 text-sm w-36">
                <option value="">All types</option>
                {BILL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Date From</label>
              <input type="date" value={filterFrom} onChange={e=>{setFilterFrom(e.target.value);setPage(1)}} className="input-base h-9 text-sm w-36"/>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Date To</label>
              <input type="date" value={filterTo} onChange={e=>{setFilterTo(e.target.value);setPage(1)}} className="input-base h-9 text-sm w-36"/>
            </div>
            {(filterStatus||filterType||filterFrom||filterTo) && (
              <div className="flex flex-col justify-end">
                <button onClick={()=>{setFilterStatus('');setFilterType('');setFilterFrom('');setFilterTo('');setPage(1)}}
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
                {['Bill No','Owner / Animal','Hospital','Type','Date','Amount','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:5}).map((_,i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({length:8}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-20"/></td>)}
                  </tr>
                ))
              ) : !bills.length ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400">
                    <ReceiptText size={32} className="mx-auto mb-3 text-slate-300"/>
                    <p className="font-medium text-slate-500">No bills found</p>
                    <p className="text-xs mt-1">{canWrite ? 'Create a bill to get started' : 'Check back later'}</p>
                  </td>
                </tr>
              ) : bills.map(b => (
                <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <code className="text-xs font-mono font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">{b.bill_number}</code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{b.owner?.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {b.owner?.phone}
                      {b.animal && <span className="ml-1">· {b.animal.animal_type}{b.animal.breed?' '+b.animal.breed:''}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-[120px] truncate">{b.hospital?.name}</td>
                  <td className="px-4 py-3"><span className={'text-xs font-medium px-2 py-0.5 rounded-full border ' + (TYPE_COLORS[b.bill_type]||TYPE_COLORS.OTHER)}>{b.bill_type}</span></td>
                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{b.bill_date}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">₹{parseFloat(b.total_amount).toFixed(0)}</div>
                    {b.items?.length > 0 && <div className="text-xs text-slate-400">{b.items.length} item{b.items.length>1?'s':''}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={'w-1.5 h-1.5 rounded-full flex-shrink-0 ' + STATUS_CONFIG[b.status]?.dot}/>
                      <span className={'text-xs font-medium px-2 py-0.5 rounded-full border ' + STATUS_CONFIG[b.status]?.color}>{STATUS_CONFIG[b.status]?.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setDetailId(b.id)}
                      className="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors" title="View">
                      <Eye size={14}/>
                    </button>
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

      <CreateBillModal
        open={createModal} onClose={() => setCreateModal(false)}
        onSaved={onCreated} hospitals={hospitals}
      />
      <BillDetailDrawer
        billId={detailId} open={!!detailId}
        onClose={() => setDetailId(null)}
        onPaid={onPaid} canPay={canPay}
      />
    </div>
  )
}
