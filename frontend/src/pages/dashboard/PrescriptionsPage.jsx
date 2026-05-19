import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Search, RefreshCw, X, Mail, Pencil,
  ChevronLeft, ChevronRight, FileText, Printer, CheckCircle2,
} from 'lucide-react'
import { prescriptionApi } from '../../api/prescriptions.js'
import { animalApi }       from '../../api/animals.js'
import { Button }          from '../../components/ui/Button.jsx'
import { useAuth }         from '../../hooks/useAuth.jsx'
import PrescriptionModal   from '../../components/prescription/PrescriptionModal.jsx'
import PrescriptionDrawer  from '../../components/prescription/PrescriptionDrawer.jsx'

const ANIMAL_EMOJIS = { COW:'🐄',BUFFALO:'🐃',GOAT:'🐐',DOG:'🐕',CAMEL:'🐪',HORSE:'🐎',SHEEP:'🐑',OTHER:'🐾' }
const STATUS_STYLE  = { ACTIVE:'bg-green-50 text-green-700 border-green-200', COMPLETED:'bg-blue-50 text-blue-700 border-blue-200', CANCELLED:'bg-red-50 text-red-700 border-red-200' }

function fmt(d) { return d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—' }

export default function PrescriptionsPage() {
  const { getUser } = useAuth()
  const user = getUser()
  const canWrite = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR'].includes(user?.role)

  const [data,       setData]       = useState({ prescriptions:[], pagination:{ total:0,page:1,pages:1 } })
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(1)
  const [search,     setSearch]     = useState('')
  const [toast,      setToast]      = useState(null)
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editData,   setEditData]   = useState(null)
  const [drawerRx,   setDrawerRx]   = useState(null)
  const [emailing,   setEmailing]   = useState(null)
  const searchTimer = useRef(null)

  function showToast(msg, type='success') {
    setToast({ message:msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchData = useCallback(async (pg=page) => {
    setLoading(true)
    try {
      const res = await prescriptionApi.list({ page:pg, limit:10 })
      setData(res.data.data)
    } catch { showToast('Failed to load prescriptions','error') }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchData(page) }, [page])

  function onSaved() {
    showToast(editData ? 'Prescription updated' : 'Prescription created & email sent')
    fetchData(page)
  }

  async function handleSendEmail(rx) {
    if (!rx.owner?.email) {
      const em = prompt(`Enter owner email for ${rx.owner?.name}:`)
      if (!em) return
      setEmailing(rx.id)
      try {
        await prescriptionApi.sendEmail(rx.id, { email: em })
        showToast(`Prescription sent to ${em}`)
        fetchData(page)
      } catch (err) { showToast(err?.response?.data?.message || 'Failed to send','error') }
      finally { setEmailing(null) }
      return
    }
    setEmailing(rx.id)
    try {
      await prescriptionApi.sendEmail(rx.id, {})
      showToast(`Prescription sent to ${rx.owner.email}`)
      fetchData(page)
    } catch (err) { showToast(err?.response?.data?.message || 'Failed to send','error') }
    finally { setEmailing(null) }
  }

  const { prescriptions, pagination } = data
  const totalPages = pagination?.pages || 1

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in ${toast.type==='error'?'bg-red-600 text-white':'bg-green-600 text-white'}`}>
          {toast.message}<button onClick={()=>setToast(null)}><X size={14}/></button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Prescriptions</h1>
          <p className="text-sm text-slate-500 mt-1">{pagination?.total || 0} total prescriptions</p>
        </div>
        {canWrite && (
          <Button icon={Plus} onClick={() => { setEditData(null); setModalOpen(true) }}>
            New Prescription
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-3">
        <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <Search size={15} className="text-slate-400 flex-shrink-0"/>
          <input type="text" placeholder="Search by animal, owner, diagnosis…"
            value={search} onChange={e=>setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm placeholder:text-slate-400 outline-none text-slate-700"/>
          {search && <button onClick={()=>setSearch('')}><X size={14} className="text-slate-400"/></button>}
        </div>
        <button onClick={()=>fetchData(page)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
          <RefreshCw size={15} className={loading?'animate-spin':''}/> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Date','Animal / Owner','Doctor','Diagnosis','Medicines','Follow-up','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:5}).map((_,i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({length:8}).map((_,j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-20"/></td>
                    ))}
                  </tr>
                ))
              ) : !prescriptions.length ? (
                <tr><td colSpan={8} className="text-center py-16 text-slate-400">
                  <FileText size={32} className="mx-auto mb-3 text-slate-300"/>
                  <p className="font-medium text-slate-500">No prescriptions yet</p>
                  {canWrite && <p className="text-xs mt-1">Click "New Prescription" to get started</p>}
                </td></tr>
              ) : prescriptions
                .filter(rx => !search || [
                  rx.animal?.animal_type, rx.animal?.breed, rx.owner?.name,
                  rx.diagnosis, rx.doctor?.name,
                ].some(v => v?.toLowerCase().includes(search.toLowerCase())))
                .map(rx => (
                <tr key={rx.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">

                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmt(rx.createdAt||rx.created_at)}</td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{ANIMAL_EMOJIS[rx.animal?.animal_type]||'🐾'}</span>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{rx.animal?.animal_type}{rx.animal?.breed?' · '+rx.animal.breed:''}</p>
                        <p className="text-xs text-slate-400">{rx.owner?.name} · {rx.owner?.phone}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-700">Dr. {rx.doctor?.name}</p>
                    <p className="text-xs text-slate-400">{rx.hospital?.name}</p>
                  </td>

                  <td className="px-4 py-3 max-w-[150px]">
                    <p className="text-sm text-slate-700 truncate">{rx.diagnosis||'—'}</p>
                    {rx.chief_complaint && <p className="text-xs text-slate-400 truncate">{rx.chief_complaint}</p>}
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-slate-800">{rx.items?.length || 0}</span>
                    <span className="text-xs text-slate-400 ml-1">medicine{rx.items?.length !== 1 ? 's' : ''}</span>
                  </td>

                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {rx.follow_up_date ? (
                      <span className={new Date(rx.follow_up_date) < new Date() ? 'text-red-600 font-medium' : 'text-green-600'}>
                        {fmt(rx.follow_up_date)}
                      </span>
                    ) : '—'}
                  </td>

                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLE[rx.status]||''}`}>
                      {rx.status}
                    </span>
                    {rx.email_sent && <span className="ml-1 text-green-500" title="Email sent"><CheckCircle2 size={12} className="inline"/></span>}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDrawerRx(rx)}
                        className="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors" title="View">
                        <FileText size={14}/>
                      </button>
                      {canWrite && (
                        <button onClick={() => { setEditData(rx); setModalOpen(true) }}
                          className="w-8 h-8 rounded-lg hover:bg-primary-50 flex items-center justify-center text-slate-400 hover:text-primary-600 transition-colors" title="Edit">
                          <Pencil size={14}/>
                        </button>
                      )}
                      <button onClick={() => handleSendEmail(rx)} disabled={emailing===rx.id}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                          ${rx.email_sent ? 'text-green-500 hover:bg-green-50' : 'text-slate-400 hover:bg-blue-50 hover:text-blue-600'}`}
                        title={rx.email_sent ? 'Resend email' : 'Send email'}>
                        {emailing===rx.id ? <RefreshCw size={14} className="animate-spin"/> : <Mail size={14}/>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40">
                <ChevronLeft size={14}/>
              </button>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40">
                <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        )}
      </div>

      <PrescriptionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onSaved}
        editData={editData}
      />

      <PrescriptionDrawer
        prescription={drawerRx}
        open={!!drawerRx}
        onClose={() => setDrawerRx(null)}
        onEdit={(rx) => { setEditData(rx); setDrawerRx(null); setModalOpen(true) }}
        onSendEmail={handleSendEmail}
        emailing={emailing}
      />
    </div>
  )
}
