import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Search, RefreshCw, X, Filter, AlertTriangle,
  ChevronLeft, ChevronRight, Pill, PackagePlus,
  ArrowRightLeft, Package, TrendingDown, Clock,
} from 'lucide-react'
import { pharmacyApi } from '../../api/pharmacy.js'
import { MedicineModal } from '../../components/pharmacy/MedicineModal.jsx'
import { StockInModal }  from '../../components/pharmacy/StockInModal.jsx'
import { ConfirmDialog } from '../../components/hospital/ConfirmDialog.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { useAuth } from '../../hooks/useAuth.jsx'

const CAT_COLORS = {
  TABLET:   'bg-blue-50 text-blue-700 border-blue-200',
  CAPSULE:  'bg-purple-50 text-purple-700 border-purple-200',
  INJECTION:'bg-red-50 text-red-700 border-red-200',
  SYRUP:    'bg-amber-50 text-amber-700 border-amber-200',
  OINTMENT: 'bg-teal-50 text-teal-700 border-teal-200',
  POWDER:   'bg-orange-50 text-orange-700 border-orange-200',
  VACCINE:  'bg-green-50 text-green-700 border-green-200',
  SURGICAL: 'bg-slate-100 text-slate-700 border-slate-300',
  OTHER:    'bg-gray-50 text-gray-700 border-gray-200',
}

const TABS = [
  { id:'stock',     label:'Stock Overview', icon: Package },
  { id:'medicines', label:'Medicine Master', icon: Pill },
  { id:'movements', label:'Movement Log',   icon: ArrowRightLeft },
  { id:'alerts',    label:'Alerts',         icon: AlertTriangle },
]

function Stat({ icon:Icon, label, value, color, alert }) {
  const colors = { blue:'text-blue-600 bg-blue-50', green:'text-green-600 bg-green-50', amber:'text-amber-600 bg-amber-50', red:'text-red-600 bg-red-50' }
  return (
    <div className={`bg-white rounded-2xl border p-4 flex items-center gap-3 ${alert ? 'border-red-200' : 'border-slate-200'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]||colors.blue}`}><Icon size={18}/></div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className={`text-xl font-display font-bold ${alert && value > 0 ? 'text-red-600' : 'text-slate-800'}`}>{value ?? 0}</p>
      </div>
    </div>
  )
}

function CatBadge({ cat }) {
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${CAT_COLORS[cat]||CAT_COLORS.OTHER}`}>{cat}</span>
}

const MOVE_COLORS = { IN:'bg-green-50 text-green-700', OUT:'bg-red-50 text-red-700', TRANSFER_IN:'bg-blue-50 text-blue-700', TRANSFER_OUT:'bg-purple-50 text-purple-700', DISPENSED:'bg-amber-50 text-amber-700', EXPIRED:'bg-slate-100 text-slate-600', ADJUSTMENT:'bg-teal-50 text-teal-700' }

// ════════════════════════════════════════════════════════════
export default function PharmacyPage() {
  const { getUser } = useAuth()
  const user = getUser()
  const canWrite  = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','PHARMACIST'].includes(user?.role)
  const canAdmin  = ['STATE_ADMIN','DISTRICT_ADMIN'].includes(user?.role)

  const [tab,      setTab]      = useState('stock')
  const [stats,    setStats]    = useState(null)
  const [alerts,   setAlerts]   = useState({ expiring:[], lowStock:[], total:0 })
  const [hospitals,setHospitals]= useState([])
  const [medicines,setMedicines]= useState([])

  // Stock tab
  const [stock,       setStock]       = useState({ stock:[], pagination:{ total:0,page:1,pages:1 } })
  const [stockLoading,setStockLoading]= useState(true)
  const [stockPage,   setStockPage]   = useState(1)
  const [stockSearch, setStockSearch] = useState('')
  const [lowFilter,   setLowFilter]   = useState(false)

  // Medicines tab
  const [medData,    setMedData]    = useState({ medicines:[], pagination:{ total:0,page:1,pages:1 } })
  const [medLoading, setMedLoading] = useState(true)
  const [medPage,    setMedPage]    = useState(1)
  const [medSearch,  setMedSearch]  = useState('')
  const [medCat,     setMedCat]     = useState('')

  // Movements tab
  const [moves,       setMoves]       = useState({ movements:[], pagination:{ total:0,page:1,pages:1 } })
  const [moveLoading, setMoveLoading] = useState(true)
  const [movePage,    setMovePage]    = useState(1)

  // Modals
  const [medModal,   setMedModal]   = useState(false)
  const [editMed,    setEditMed]    = useState(null)
  const [stockModal, setStockModal] = useState(false)
  const [toast,      setToast]      = useState(null)

  const searchTimer = useRef(null)

  function showToast(msg, type='success') {
    setToast({ message:msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Load static data
  useEffect(() => {
    pharmacyApi.getStats().then(r => setStats(r.data.data)).catch(()=>{})
    pharmacyApi.getAlerts().then(r => setAlerts(r.data.data)).catch(()=>{})
    pharmacyApi.getHospitals().then(r => setHospitals(r.data.data)).catch(()=>{})
    pharmacyApi.listMedicines({ limit:200 }).then(r => setMedicines(r.data.data.medicines||[])).catch(()=>{})
  }, [])

  // Stock
  const fetchStock = useCallback(async (pg=stockPage) => {
    setStockLoading(true)
    try {
      const r = await pharmacyApi.getStock({ page:pg, limit:10, search:stockSearch, low_stock:lowFilter?'true':'' })
      setStock(r.data.data)
    } catch { showToast('Failed to load stock','error') }
    finally { setStockLoading(false) }
  }, [stockPage, stockSearch, lowFilter])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setStockPage(1); fetchStock(1) }, 350)
    return () => clearTimeout(searchTimer.current)
  }, [stockSearch, lowFilter])
  useEffect(() => { fetchStock(stockPage) }, [stockPage])

  // Medicines
  const fetchMeds = useCallback(async (pg=medPage) => {
    setMedLoading(true)
    try {
      const r = await pharmacyApi.listMedicines({ page:pg, limit:10, search:medSearch, category:medCat })
      setMedData(r.data.data)
    } catch { showToast('Failed to load medicines','error') }
    finally { setMedLoading(false) }
  }, [medPage, medSearch, medCat])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setMedPage(1); fetchMeds(1) }, 350)
    return () => clearTimeout(searchTimer.current)
  }, [medSearch, medCat])
  useEffect(() => { fetchMeds(medPage) }, [medPage])

  // Movements
  const fetchMoves = useCallback(async (pg=movePage) => {
    setMoveLoading(true)
    try {
      const r = await pharmacyApi.getMovements({ page:pg, limit:15 })
      setMoves(r.data.data)
    } catch {}
    finally { setMoveLoading(false) }
  }, [movePage])
  useEffect(() => { if (tab==='movements') fetchMoves(movePage) }, [movePage, tab])

  function onStockSaved() {
    showToast('Stock updated successfully')
    fetchStock(stockPage)
    pharmacyApi.getStats().then(r => setStats(r.data.data)).catch(()=>{})
    pharmacyApi.getAlerts().then(r => setAlerts(r.data.data)).catch(()=>{})
  }

  const today = new Date().toISOString().split('T')[0]

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
          <h1 className="font-display text-2xl font-bold text-slate-800">Pharmacy & Medicine</h1>
          <p className="text-sm text-slate-500 mt-1">Track medicines, batches and stock levels</p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="secondary" icon={Plus} onClick={() => { setEditMed(null); setMedModal(true) }}>Add Medicine</Button>
            <Button icon={PackagePlus} onClick={() => setStockModal(true)}>Stock In</Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Pill}         label="Total Medicines"  value={stats?.totalMedicines}  color="blue"/>
        <Stat icon={Package}      label="Active Batches"   value={stats?.totalBatches}    color="green"/>
        <Stat icon={Clock}        label="Expiring (30d)"   value={stats?.expiringBatches} color="amber" alert={stats?.expiringBatches > 0}/>
        <Stat icon={TrendingDown} label="Low Stock Items"  value={stats?.lowStockCount}   color="red"   alert={stats?.lowStockCount > 0}/>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center border-b border-slate-100 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${tab===t.id ? 'border-primary-600 text-primary-700 bg-primary-50/30' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
              <t.icon size={15}/>
              {t.label}
              {t.id==='alerts' && alerts.total > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full ml-1">{alerts.total}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* ── STOCK TAB ── */}
          {tab==='stock' && (
            <>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <Search size={15} className="text-slate-400 flex-shrink-0"/>
                  <input type="text" placeholder="Search medicine…" value={stockSearch} onChange={e=>setStockSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm placeholder:text-slate-400 outline-none font-body text-slate-700"/>
                  {stockSearch && <button onClick={()=>setStockSearch('')}><X size={14} className="text-slate-400"/></button>}
                </div>
                <button onClick={()=>setLowFilter(f=>!f)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${lowFilter?'bg-red-50 border-red-200 text-red-700':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <TrendingDown size={15}/> Low Stock {lowFilter && '✓'}
                </button>
                <button onClick={()=>fetchStock(stockPage)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  <RefreshCw size={15} className={stockLoading?'animate-spin':''}/> Refresh
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Medicine','Category','Hospital','Total Stock','Batches','Expiry Status','Alert'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stockLoading ? (
                      Array.from({length:5}).map((_,i) => (
                        <tr key={i} className="border-b border-slate-100">
                          {Array.from({length:7}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-20"/></td>)}
                        </tr>
                      ))
                    ) : !stock.stock?.length ? (
                      <tr><td colSpan={7} className="text-center py-12 text-slate-400">
                        <Package size={28} className="mx-auto mb-2 text-slate-300"/>
                        <p>No stock found</p>
                      </td></tr>
                    ) : stock.stock.map((s,i) => {
                      const isLow = s.total_qty <= (s.medicine?.min_stock_level || 10)
                      return (
                        <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50 ${isLow?'bg-red-50/30':''}`}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{s.medicine?.name}</div>
                            {s.medicine?.generic_name && <div className="text-xs text-slate-400">{s.medicine.generic_name}</div>}
                          </td>
                          <td className="px-4 py-3"><CatBadge cat={s.medicine?.category}/></td>
                          <td className="px-4 py-3 text-sm text-slate-600">{s.hospital?.name}</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold text-lg ${isLow?'text-red-600':'text-slate-800'}`}>{s.total_qty}</span>
                            <span className="text-xs text-slate-400 ml-1">{s.medicine?.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{s.batches?.length}</td>
                          <td className="px-4 py-3">
                            {s.expired ? <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Expired</span>
                              : s.expiring_soon ? <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Expiring soon</span>
                              : <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">OK</span>}
                          </td>
                          <td className="px-4 py-3">
                            {isLow && <span className="flex items-center gap-1 text-xs text-red-600 font-medium"><AlertTriangle size={12}/>Low</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {stock.pagination?.pages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-400">{stock.pagination.total} items</span>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>setStockPage(p=>Math.max(1,p-1))} disabled={stockPage===1} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40"><ChevronLeft size={14}/></button>
                    <span className="text-sm text-slate-600 px-2">{stockPage}/{stock.pagination.pages}</span>
                    <button onClick={()=>setStockPage(p=>Math.min(stock.pagination.pages,p+1))} disabled={stockPage===stock.pagination.pages} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40"><ChevronRight size={14}/></button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── MEDICINES TAB ── */}
          {tab==='medicines' && (
            <>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <Search size={15} className="text-slate-400 flex-shrink-0"/>
                  <input type="text" placeholder="Search medicine name…" value={medSearch} onChange={e=>setMedSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm placeholder:text-slate-400 outline-none font-body text-slate-700"/>
                  {medSearch && <button onClick={()=>setMedSearch('')}><X size={14} className="text-slate-400"/></button>}
                </div>
                <select value={medCat} onChange={e=>{setMedCat(e.target.value);setMedPage(1)}} className="input-base h-10 text-sm w-36">
                  <option value="">All categories</option>
                  {['TABLET','CAPSULE','INJECTION','SYRUP','OINTMENT','POWDER','VACCINE','SURGICAL','OTHER'].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={()=>fetchMeds(medPage)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  <RefreshCw size={15} className={medLoading?'animate-spin':''}/> Refresh
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Name','Generic Name','Category','Unit','Min Level','Status', canAdmin?'Actions':''].filter(Boolean).map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {medLoading ? (
                      Array.from({length:5}).map((_,i) => (
                        <tr key={i} className="border-b border-slate-100">
                          {Array.from({length:7}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-20"/></td>)}
                        </tr>
                      ))
                    ) : !medData.medicines?.length ? (
                      <tr><td colSpan={7} className="text-center py-12 text-slate-400">
                        <Pill size={28} className="mx-auto mb-2 text-slate-300"/><p>No medicines found</p>
                      </td></tr>
                    ) : medData.medicines.map(m => (
                      <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                        <td className="px-4 py-3 font-semibold text-slate-800">{m.name}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{m.generic_name||'—'}</td>
                        <td className="px-4 py-3"><CatBadge cat={m.category}/></td>
                        <td className="px-4 py-3 text-slate-600">{m.unit}</td>
                        <td className="px-4 py-3 text-slate-600">{m.min_stock_level}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${m.status==='ACTIVE'?'bg-green-50 text-green-700 border-green-200':'bg-slate-100 text-slate-500 border-slate-200'}`}>{m.status}</span>
                        </td>
                        {canAdmin && (
                          <td className="px-4 py-3">
                            <button onClick={() => { setEditMed(m); setMedModal(true) }}
                              className="text-xs text-primary-600 hover:text-primary-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {medData.pagination?.pages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-400">{medData.pagination.total} medicines</span>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>setMedPage(p=>Math.max(1,p-1))} disabled={medPage===1} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40"><ChevronLeft size={14}/></button>
                    <span className="text-sm text-slate-600 px-2">{medPage}/{medData.pagination.pages}</span>
                    <button onClick={()=>setMedPage(p=>Math.min(medData.pagination.pages,p+1))} disabled={medPage===medData.pagination.pages} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40"><ChevronRight size={14}/></button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── MOVEMENTS TAB ── */}
          {tab==='movements' && (
            <>
              <div className="flex justify-end mb-4">
                <button onClick={()=>fetchMoves(movePage)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  <RefreshCw size={15} className={moveLoading?'animate-spin':''}/> Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Medicine','Type','Quantity','Performed By','Notes','Date'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {moveLoading ? (
                      Array.from({length:8}).map((_,i) => (
                        <tr key={i} className="border-b border-slate-100">
                          {Array.from({length:6}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-20"/></td>)}
                        </tr>
                      ))
                    ) : !moves.movements?.length ? (
                      <tr><td colSpan={6} className="text-center py-12 text-slate-400">No movements recorded</td></tr>
                    ) : moves.movements.map(m => (
                      <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{m.medicine?.name}</td>
                        <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${MOVE_COLORS[m.type]||'bg-slate-100 text-slate-600'}`}>{m.type.replace('_',' ')}</span></td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${['IN','TRANSFER_IN'].includes(m.type)?'text-green-600':'text-red-600'}`}>
                            {['IN','TRANSFER_IN'].includes(m.type)?'+':'-'}{m.quantity}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">{m.medicine?.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{m.performer?.name||'System'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 max-w-[150px] truncate">{m.notes||'—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{new Date(m.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {moves.pagination?.pages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button onClick={()=>setMovePage(p=>Math.max(1,p-1))} disabled={movePage===1} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40"><ChevronLeft size={14}/></button>
                    <span className="text-sm text-slate-600 px-2">{movePage}/{moves.pagination.pages}</span>
                    <button onClick={()=>setMovePage(p=>Math.min(moves.pagination.pages,p+1))} disabled={movePage===moves.pagination.pages} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40"><ChevronRight size={14}/></button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── ALERTS TAB ── */}
          {tab==='alerts' && (
            <div className="space-y-6">
              {/* Expiring soon */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-amber-500"/> Expiring within 30 days ({alerts.expiring?.length||0})
                </h3>
                {!alerts.expiring?.length ? <p className="text-sm text-slate-400 py-4 text-center">No medicines expiring soon ✓</p> : (
                  <div className="space-y-2">
                    {alerts.expiring.map(b => {
                      const days = Math.ceil((new Date(b.expiry_date)-new Date(today))/(1000*60*60*24))
                      return (
                        <div key={b.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${days <= 0?'bg-red-50 border-red-200':'bg-amber-50 border-amber-200'}`}>
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{b.medicine?.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Batch: {b.batch_number} · {b.hospital?.name} · Qty: {b.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${days<=0?'text-red-600':'text-amber-600'}`}>{days<=0?'EXPIRED':`${days}d left`}</p>
                            <p className="text-xs text-slate-400">{b.expiry_date}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Low stock */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <TrendingDown size={16} className="text-red-500"/> Low Stock ({alerts.lowStock?.length||0})
                </h3>
                {!alerts.lowStock?.length ? <p className="text-sm text-slate-400 py-4 text-center">All stock levels are adequate ✓</p> : (
                  <div className="space-y-2">
                    {alerts.lowStock.map((s,i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl border bg-red-50 border-red-200">
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{s.medicine?.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{s.hospital?.name} · Min level: {s.medicine?.min_stock_level}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">{s.total_qty}</p>
                          <p className="text-xs text-slate-400">{s.medicine?.unit} remaining</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      <MedicineModal open={medModal} onClose={()=>setMedModal(false)}
        onSaved={() => { showToast(editMed?'Medicine updated':'Medicine added'); fetchMeds(medPage); pharmacyApi.listMedicines({limit:200}).then(r=>setMedicines(r.data.data.medicines||[])).catch(()=>{}) }}
        editData={editMed}/>

      <StockInModal open={stockModal} onClose={()=>setStockModal(false)}
        onSaved={onStockSaved} hospitals={hospitals} medicines={medicines}
        defaultHospitalId={user?.hospitalId||''}/>
    </div>
  )
}
