import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Search, RefreshCw, X,
  ChevronLeft, ChevronRight, Package,
  PackagePlus, PackageMinus, AlertTriangle,
  ArrowRightLeft, TrendingDown, Clock, Pencil,
} from 'lucide-react'
import { inventoryApi } from '../../api/inventory.js'
import { InventoryItemModal } from '../../components/inventory/InventoryItemModal.jsx'
import { StockInOutModal }    from '../../components/inventory/StockInOutModal.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { useAuth } from '../../hooks/useAuth.jsx'

const CAT_COLORS = {
  SURGICAL:    'bg-red-50 text-red-700 border-red-200',
  EQUIPMENT:   'bg-blue-50 text-blue-700 border-blue-200',
  CONSUMABLE:  'bg-amber-50 text-amber-700 border-amber-200',
  VACCINE:     'bg-green-50 text-green-700 border-green-200',
  DISINFECTANT:'bg-teal-50 text-teal-700 border-teal-200',
  PPE:         'bg-purple-50 text-purple-700 border-purple-200',
  OTHER:       'bg-slate-100 text-slate-600 border-slate-200',
}

const MOVE_COLORS = {
  IN:'text-green-600 bg-green-50', OUT:'text-red-600 bg-red-50',
  TRANSFER_IN:'text-blue-600 bg-blue-50', TRANSFER_OUT:'text-purple-600 bg-purple-50',
  ADJUSTMENT:'text-teal-600 bg-teal-50', EXPIRED:'text-slate-500 bg-slate-100',
}

const TABS = [
  { id:'stock',     label:'Stock Overview', icon:Package },
  { id:'items',     label:'Item Master',    icon:Plus },
  { id:'movements', label:'Movement Log',   icon:ArrowRightLeft },
  { id:'alerts',    label:'Alerts',         icon:AlertTriangle },
]

function Stat({ icon:Icon, label, value, color, alert }) {
  const colors = { blue:'text-blue-600 bg-blue-50', green:'text-green-600 bg-green-50', amber:'text-amber-600 bg-amber-50', red:'text-red-600 bg-red-50' }
  return (
    <div className={'bg-white rounded-2xl border p-4 flex items-center gap-3 ' + (alert ? 'border-red-200' : 'border-slate-200')}>
      <div className={'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ' + (colors[color]||colors.blue)}><Icon size={18}/></div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className={'text-xl font-display font-bold ' + (alert && value > 0 ? 'text-red-600' : 'text-slate-800')}>{value ?? 0}</p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function InventoryPage() {
  const { getUser } = useAuth()
  const user = getUser()
  const canWrite = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','PHARMACIST'].includes(user?.role)
  const canAdmin = ['STATE_ADMIN','DISTRICT_ADMIN'].includes(user?.role)

  const [tab,       setTab]       = useState('stock')
  const [stats,     setStats]     = useState(null)
  const [alerts,    setAlerts]    = useState({ expiring:[], lowStock:[], total:0 })
  const [hospitals, setHospitals] = useState([])
  const [items,     setItems]     = useState([])

  // Stock
  const [stock,       setStock]       = useState({ stock:[], pagination:{ total:0,page:1,pages:1 } })
  const [stockLoad,   setStockLoad]   = useState(true)
  const [stockPage,   setStockPage]   = useState(1)
  const [stockSearch, setStockSearch] = useState('')
  const [stockCat,    setStockCat]    = useState('')
  const [lowFilter,   setLowFilter]   = useState(false)

  // Items
  const [itemData,   setItemData]   = useState({ items:[], pagination:{ total:0,page:1,pages:1 } })
  const [itemLoad,   setItemLoad]   = useState(true)
  const [itemPage,   setItemPage]   = useState(1)
  const [itemSearch, setItemSearch] = useState('')
  const [itemCat,    setItemCat]    = useState('')

  // Movements
  const [moves,     setMoves]     = useState({ movements:[], pagination:{ total:0,page:1,pages:1 } })
  const [moveLoad,  setMoveLoad]  = useState(true)
  const [movePage,  setMovePage]  = useState(1)

  // Modals
  const [itemModal,   setItemModal]   = useState(false)
  const [editItem,    setEditItem]    = useState(null)
  const [stockModal,  setStockModal]  = useState(false)
  const [stockMode,   setStockMode]   = useState('in')
  const [toast,       setToast]       = useState(null)

  const timer = useRef(null)

  function showToast(msg, type='success') {
    setToast({ message:msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function openStockModal(mode) { setStockMode(mode); setStockModal(true) }

  // Load static data
  useEffect(() => {
    inventoryApi.getStats().then(r => setStats(r.data.data)).catch(()=>{})
    inventoryApi.getAlerts().then(r => setAlerts(r.data.data)).catch(()=>{})
    inventoryApi.getHospitals().then(r => setHospitals(r.data.data)).catch(()=>{})
    inventoryApi.listItems({ limit:200 }).then(r => setItems(r.data.data.items||[])).catch(()=>{})
  }, [])

  // Stock
  const fetchStock = useCallback(async (pg=stockPage) => {
    setStockLoad(true)
    try {
      const r = await inventoryApi.getStock({ page:pg, limit:10, search:stockSearch, category:stockCat, low_stock:lowFilter?'true':'' })
      setStock(r.data.data)
    } catch { showToast('Failed to load stock','error') }
    finally { setStockLoad(false) }
  }, [stockPage, stockSearch, stockCat, lowFilter])

  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { setStockPage(1); fetchStock(1) }, 350)
    return () => clearTimeout(timer.current)
  }, [stockSearch, stockCat, lowFilter])
  useEffect(() => { fetchStock(stockPage) }, [stockPage])

  // Items
  const fetchItems = useCallback(async (pg=itemPage) => {
    setItemLoad(true)
    try {
      const r = await inventoryApi.listItems({ page:pg, limit:10, search:itemSearch, category:itemCat })
      setItemData(r.data.data)
    } catch {}
    finally { setItemLoad(false) }
  }, [itemPage, itemSearch, itemCat])

  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { setItemPage(1); fetchItems(1) }, 350)
    return () => clearTimeout(timer.current)
  }, [itemSearch, itemCat])
  useEffect(() => { fetchItems(itemPage) }, [itemPage])

  // Movements
  const fetchMoves = useCallback(async (pg=movePage) => {
    setMoveLoad(true)
    try {
      const r = await inventoryApi.getMovements({ page:pg, limit:15 })
      setMoves(r.data.data)
    } catch {}
    finally { setMoveLoad(false) }
  }, [movePage])
  useEffect(() => { if (tab==='movements') fetchMoves(movePage) }, [movePage, tab])

  function onStockSaved() {
    showToast('Stock updated')
    fetchStock(stockPage)
    inventoryApi.getStats().then(r => setStats(r.data.data)).catch(()=>{})
    inventoryApi.getAlerts().then(r => setAlerts(r.data.data)).catch(()=>{})
  }

  function onItemSaved() {
    showToast(editItem ? 'Item updated' : 'Item added')
    fetchItems(itemPage)
    inventoryApi.listItems({ limit:200 }).then(r => setItems(r.data.data.items||[])).catch(()=>{})
  }

  const today = new Date().toISOString().split('T')[0]

  const CATEGORIES = ['SURGICAL','EQUIPMENT','CONSUMABLE','VACCINE','DISINFECTANT','PPE','OTHER']

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {toast && (
        <div className={'fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in ' + (toast.type==='error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white')}>
          {toast.message}<button onClick={()=>setToast(null)}><X size={14}/></button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Inventory Management</h1>
          <p className="text-sm text-slate-500 mt-1">Surgical items, equipment, consumables, PPE</p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            {canAdmin && <Button variant="secondary" icon={Plus} onClick={() => { setEditItem(null); setItemModal(true) }}>Add Item</Button>}
            <Button variant="outline" icon={PackageMinus} onClick={() => openStockModal('out')}>Stock Out</Button>
            <Button icon={PackagePlus} onClick={() => openStockModal('in')}>Stock In</Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Package}      label="Total Items"    value={stats?.totalItems}    color="blue"/>
        <Stat icon={Package}      label="Total Stock"    value={stats?.totalStock}    color="green"/>
        <Stat icon={Clock}        label="Expiring (30d)" value={stats?.expiringCount} color="amber" alert={stats?.expiringCount > 0}/>
        <Stat icon={TrendingDown} label="Low Stock"      value={stats?.lowStockCount} color="red"   alert={stats?.lowStockCount > 0}/>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center border-b border-slate-100 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ' +
                (tab===t.id ? 'border-primary-600 text-primary-700 bg-primary-50/30' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')}>
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
                  <input type="text" placeholder="Search item name or code…" value={stockSearch} onChange={e=>setStockSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm placeholder:text-slate-400 outline-none font-body text-slate-700"/>
                  {stockSearch && <button onClick={()=>setStockSearch('')}><X size={14} className="text-slate-400"/></button>}
                </div>
                <select value={stockCat} onChange={e=>{setStockCat(e.target.value);setStockPage(1)}} className="input-base h-10 text-sm w-36">
                  <option value="">All categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={()=>setLowFilter(f=>!f)}
                  className={'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ' + (lowFilter ? 'bg-red-50 border-red-200 text-red-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                  <TrendingDown size={15}/> Low Stock {lowFilter && '✓'}
                </button>
                <button onClick={()=>fetchStock(stockPage)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  <RefreshCw size={15} className={stockLoad?'animate-spin':''}/> Refresh
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Item','Code','Category','Hospital','Qty','Batch / Expiry','Status'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stockLoad ? (
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
                    ) : stock.stock.map((s,i) => (
                      <tr key={i} className={'border-b border-slate-100 hover:bg-slate-50 ' + (s.is_low ? 'bg-red-50/30' : '')}>
                        <td className="px-4 py-3 font-semibold text-slate-800">{s.item?.name}</td>
                        <td className="px-4 py-3"><code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{s.item?.code||'—'}</code></td>
                        <td className="px-4 py-3"><span className={'text-xs font-medium px-2 py-0.5 rounded-full border ' + (CAT_COLORS[s.item?.category]||CAT_COLORS.OTHER)}>{s.item?.category}</span></td>
                        <td className="px-4 py-3 text-sm text-slate-600">{s.hospital?.name}</td>
                        <td className="px-4 py-3">
                          <span className={'font-bold text-lg ' + (s.is_low ? 'text-red-600' : 'text-slate-800')}>{s.quantity}</span>
                          <span className="text-xs text-slate-400 ml-1">{s.item?.unit}</span>
                        </td>
                        <td className="px-4 py-3">
                          {s.batch_number && <div className="text-xs text-slate-600">Batch: {s.batch_number}</div>}
                          {s.expiry_date && <div className="text-xs text-slate-400">{s.expiry_date}</div>}
                        </td>
                        <td className="px-4 py-3">
                          {s.is_expired
                            ? <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Expired</span>
                            : s.is_expiring_soon
                              ? <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">{s.days_to_expiry}d left</span>
                              : <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">OK</span>}
                        </td>
                      </tr>
                    ))}
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

          {/* ── ITEM MASTER TAB ── */}
          {tab==='items' && (
            <>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <Search size={15} className="text-slate-400 flex-shrink-0"/>
                  <input type="text" placeholder="Search items…" value={itemSearch} onChange={e=>setItemSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm placeholder:text-slate-400 outline-none font-body text-slate-700"/>
                  {itemSearch && <button onClick={()=>setItemSearch('')}><X size={14} className="text-slate-400"/></button>}
                </div>
                <select value={itemCat} onChange={e=>{setItemCat(e.target.value);setItemPage(1)}} className="input-base h-10 text-sm w-36">
                  <option value="">All categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Name','Code','Category','Unit','Min Level','Status', canAdmin?'Actions':''].filter(Boolean).map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {itemLoad ? (
                      Array.from({length:5}).map((_,i) => (
                        <tr key={i} className="border-b border-slate-100">
                          {Array.from({length:7}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-20"/></td>)}
                        </tr>
                      ))
                    ) : !itemData.items?.length ? (
                      <tr><td colSpan={7} className="text-center py-12 text-slate-400">
                        <Package size={28} className="mx-auto mb-2 text-slate-300"/><p>No items found</p>
                      </td></tr>
                    ) : itemData.items.map(item => (
                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                        <td className="px-4 py-3"><code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{item.code||'—'}</code></td>
                        <td className="px-4 py-3"><span className={'text-xs font-medium px-2 py-0.5 rounded-full border ' + (CAT_COLORS[item.category]||CAT_COLORS.OTHER)}>{item.category}</span></td>
                        <td className="px-4 py-3 text-slate-600">{item.unit}</td>
                        <td className="px-4 py-3 text-slate-600">{item.min_stock_level}</td>
                        <td className="px-4 py-3">
                          <span className={'text-xs font-medium px-2 py-0.5 rounded-full border ' + (item.status==='ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200')}>{item.status}</span>
                        </td>
                        {canAdmin && (
                          <td className="px-4 py-3">
                            <button onClick={() => { setEditItem(item); setItemModal(true) }}
                              className="w-8 h-8 rounded-lg hover:bg-primary-50 flex items-center justify-center text-slate-400 hover:text-primary-600 transition-colors opacity-0 group-hover:opacity-100">
                              <Pencil size={14}/>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {itemData.pagination?.pages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-400">{itemData.pagination.total} items</span>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>setItemPage(p=>Math.max(1,p-1))} disabled={itemPage===1} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40"><ChevronLeft size={14}/></button>
                    <span className="text-sm text-slate-600 px-2">{itemPage}/{itemData.pagination.pages}</span>
                    <button onClick={()=>setItemPage(p=>Math.min(itemData.pagination.pages,p+1))} disabled={itemPage===itemData.pagination.pages} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40"><ChevronRight size={14}/></button>
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
                  <RefreshCw size={15} className={moveLoad?'animate-spin':''}/> Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Item','Type','Quantity','Performed By','Notes','Date'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {moveLoad ? (
                      Array.from({length:8}).map((_,i) => (
                        <tr key={i} className="border-b border-slate-100">
                          {Array.from({length:6}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-20"/></td>)}
                        </tr>
                      ))
                    ) : !moves.movements?.length ? (
                      <tr><td colSpan={6} className="text-center py-12 text-slate-400">No movements recorded</td></tr>
                    ) : moves.movements.map(m => (
                      <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{m.item?.name}</td>
                        <td className="px-4 py-3"><span className={'text-xs font-bold px-2 py-0.5 rounded-full ' + (MOVE_COLORS[m.type]||'bg-slate-100 text-slate-600')}>{m.type.replace('_',' ')}</span></td>
                        <td className="px-4 py-3">
                          <span className={'font-bold ' + (['IN','TRANSFER_IN'].includes(m.type)?'text-green-600':'text-red-600')}>
                            {['IN','TRANSFER_IN'].includes(m.type)?'+':'-'}{m.quantity}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">{m.item?.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{m.performer?.name||'System'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 max-w-[150px] truncate">{m.notes||'—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{new Date(m.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── ALERTS TAB ── */}
          {tab==='alerts' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-amber-500"/> Expiring within 30 days ({alerts.expiring?.length||0})
                </h3>
                {!alerts.expiring?.length ? <p className="text-sm text-slate-400 py-4 text-center">No items expiring soon ✓</p> : (
                  <div className="space-y-2">
                    {alerts.expiring.map((s,i) => (
                      <div key={i} className={'flex items-center justify-between px-4 py-3 rounded-xl border ' + (s.days_to_expiry<=0?'bg-red-50 border-red-200':'bg-amber-50 border-amber-200')}>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{s.item?.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{s.item?.category} · {s.hospital?.name} · Qty: {s.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className={'text-sm font-bold ' + (s.days_to_expiry<=0?'text-red-600':'text-amber-600')}>{s.days_to_expiry<=0?'EXPIRED':s.days_to_expiry+'d left'}</p>
                          <p className="text-xs text-slate-400">{s.expiry_date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <TrendingDown size={16} className="text-red-500"/> Low Stock ({alerts.lowStock?.length||0})
                </h3>
                {!alerts.lowStock?.length ? <p className="text-sm text-slate-400 py-4 text-center">All stock levels adequate ✓</p> : (
                  <div className="space-y-2">
                    {alerts.lowStock.map((s,i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl border bg-red-50 border-red-200">
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{s.item?.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{s.item?.category} · {s.hospital?.name} · Min: {s.item?.min_stock_level}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">{s.quantity}</p>
                          <p className="text-xs text-slate-400">{s.item?.unit} remaining</p>
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

      <InventoryItemModal open={itemModal} onClose={()=>setItemModal(false)} onSaved={onItemSaved} editData={editItem}/>
      <StockInOutModal open={stockModal} onClose={()=>setStockModal(false)} onSaved={onStockSaved}
        mode={stockMode} hospitals={hospitals} items={items} defaultHospitalId={user?.hospitalId||''}/>
    </div>
  )
}
