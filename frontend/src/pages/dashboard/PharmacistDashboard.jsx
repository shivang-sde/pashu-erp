import { useState, useEffect } from 'react'
import {
  Pill, AlertTriangle, Clock, Package,
  TrendingDown, ArrowRightLeft, Loader2,
} from 'lucide-react'
import { roleDashApi } from '../../api/roleDashboard.js'
import { useAuth } from '../../hooks/useAuth.jsx'

function Stat({ icon:Icon, label, value, color='blue', alert }) {
  const colors = { blue:'text-blue-600 bg-blue-50', green:'text-green-600 bg-green-50', amber:'text-amber-600 bg-amber-50', red:'text-red-600 bg-red-50', purple:'text-purple-600 bg-purple-50' }
  return (
    <div className={`bg-white rounded-2xl border p-4 flex items-center gap-3 ${alert&&value>0?'border-red-200':'border-slate-200'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}><Icon size={18}/></div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-display font-bold ${alert&&value>0?'text-red-600':'text-slate-800'}`}>{value??0}</p>
      </div>
    </div>
  )
}

const MOVE_COLORS = { IN:'text-green-600', OUT:'text-red-600', TRANSFER_IN:'text-blue-600', TRANSFER_OUT:'text-purple-600', DISPENSED:'text-amber-600', EXPIRED:'text-slate-400' }

function fmt(d) { return d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—' }

export default function PharmacistDashboard() {
  const { getUser } = useAuth()
  const user = getUser()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    roleDashApi.pharmacist()
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-slate-300"/></div>

  const { stats, lowStockItems, expiringItems, recentMovements } = data || {}

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="text-4xl">💊</div>
          <div>
            <h1 className="font-display text-xl font-bold">Pharmacy Dashboard</h1>
            <p className="text-amber-100 text-sm mt-0.5">{user?.name} · {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat icon={Pill}         label="Total Medicines"  value={stats?.totalMedicines} color="blue"/>
        <Stat icon={Package}      label="Total Batches"    value={stats?.totalBatches}   color="blue"/>
        <Stat icon={ArrowRightLeft}label="Dispensed Today" value={stats?.dispensedToday} color="green"/>
        <Stat icon={TrendingDown} label="Low Stock"        value={stats?.lowStock}       color="red" alert/>
        <Stat icon={Clock}        label="Expiring (30d)"   value={stats?.expiring}       color="amber" alert/>
        <Stat icon={AlertTriangle}label="Expired"          value={stats?.expired}        color="red" alert/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Low stock */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <TrendingDown size={16} className="text-red-400"/>
            <h3 className="font-semibold text-slate-800">Low Stock Alert ({stats?.lowStock||0})</h3>
          </div>
          {!lowStockItems?.length ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">All stock levels adequate ✓</div>
          ) : lowStockItems.map((s,i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0 bg-red-50/20">
              <Pill size={14} className="text-red-400 flex-shrink-0"/>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{s.medicine?.name}</p>
                <p className="text-xs text-slate-400">{s.medicine?.category} · Min: {s.medicine?.min_stock_level}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-lg font-bold text-red-600">{s.total_qty}</span>
                <span className="text-xs text-slate-400 ml-1">{s.medicine?.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Expiring soon */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Clock size={16} className="text-amber-400"/>
            <h3 className="font-semibold text-slate-800">Expiring Soon ({stats?.expiring||0})</h3>
          </div>
          {!expiringItems?.length ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">No medicines expiring soon ✓</div>
          ) : expiringItems.map(b => {
            const today = new Date().toISOString().split('T')[0]
            const days = Math.ceil((new Date(b.expiry_date)-new Date(today))/(86400000))
            return (
              <div key={b.id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0 bg-amber-50/20">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{b.medicine?.name}</p>
                  <p className="text-xs text-slate-400">Batch: {b.batch_number} · Qty: {b.quantity} {b.medicine?.unit}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${days<=7?'text-red-600':'text-amber-600'}`}>{days}d left</p>
                  <p className="text-xs text-slate-400">{fmt(b.expiry_date)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent movements */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <ArrowRightLeft size={16} className="text-blue-400"/>
          <h3 className="font-semibold text-slate-800">Recent Stock Movements</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              {['Medicine','Type','Quantity','Date'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>)}
            </tr></thead>
            <tbody>
              {!recentMovements?.length ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-400 text-sm">No recent movements</td></tr>
              ) : recentMovements.map(m => (
                <tr key={m.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{m.medicine?.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 ${MOVE_COLORS[m.type]||'text-slate-600'}`}>
                      {m.type.replace('_',' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${['IN','TRANSFER_IN'].includes(m.type)?'text-green-600':'text-red-600'}`}>
                      {['IN','TRANSFER_IN'].includes(m.type)?'+':'-'}{m.quantity}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">{m.medicine?.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{fmt(m.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
