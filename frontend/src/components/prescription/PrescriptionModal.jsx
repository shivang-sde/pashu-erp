import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Stethoscope, Send, Loader2 } from 'lucide-react'
import { prescriptionApi } from '../../api/prescriptions.js'
import { animalApi }       from '../../api/animals.js'
import { pharmacyApi }     from '../../api/pharmacy.js'
import { Button } from '../ui/Button.jsx'
import { useAuth } from '../../hooks/useAuth.jsx'

const EMPTY_ITEM = { medicine_name:'', medicine_id:'', dosage:'', frequency:'', duration:'', route:'Oral', instructions:'', quantity:'' }
const FREQUENCIES = ['Once daily','Twice daily','3x daily','Every 8hrs','Every 12hrs','Weekly','As needed']
const ROUTES      = ['Oral','Injection IM','Injection IV','Topical','Intranasal','Subcutaneous']
const DURATIONS   = ['3 days','5 days','7 days','10 days','14 days','21 days','1 month']

function FLabel({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export default function PrescriptionModal({ open, onClose, onSaved, editData, prefill }) {
  const { getUser } = useAuth()
  const user = getUser()

  const [form, setForm] = useState({
    animal_id:'', owner_id:'', appointment_id:'', hospital_id:'',
    chief_complaint:'', diagnosis:'', notes:'', follow_up_date:'',
    sendEmail: true,
    ownerEmail:'',
  })
  const [items,    setItems]    = useState([{ ...EMPTY_ITEM }])
  const [errors,   setErrors]   = useState({})
  const [saving,   setSaving]   = useState(false)
  const [apiErr,   setApiErr]   = useState('')
  const [animals,  setAnimals]  = useState([])
  const [medicines,setMedicines]= useState([])
  const [selAnimal,setSelAnimal]= useState(null)
  const [animalSearch,   setAnimalSearch]   = useState('')
  const [showAnimalDrop, setShowAnimalDrop] = useState(false)
  const [prevRx,         setPrevRx]         = useState([])
  const [showPrevRx,     setShowPrevRx]     = useState(false)
  const [loadingPrevRx,  setLoadingPrevRx]  = useState(false)

  const isEdit = !!editData

  // Load medicines for autocomplete
  useEffect(() => {
    pharmacyApi.listMedicines({ limit:500 })
      .then(r => setMedicines(r.data.data.medicines || []))
      .catch(() => {})
  }, [])

  // Search animals
  useEffect(() => {
    if (!animalSearch || animalSearch.length < 2) { setAnimals([]); return }
    const t = setTimeout(() => {
      animalApi.list({ search: animalSearch, limit: 8 })
        .then(r => setAnimals(r.data.data.animals || []))
        .catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [animalSearch])

  // Populate on edit
  useEffect(() => {
    if (!open) return
    if (editData) {
      setForm({
        animal_id:      editData.animal_id      || '',
        owner_id:       editData.owner_id       || '',
        appointment_id: editData.appointment_id || '',
        hospital_id:    editData.hospital_id    || '',
        chief_complaint:editData.chief_complaint|| '',
        diagnosis:      editData.diagnosis      || '',
        notes:          editData.notes          || '',
        follow_up_date: editData.follow_up_date || '',
        ownerEmail:     editData.owner?.email   || '',
      })
      setSelAnimal(editData.animal ? { ...editData.animal, owner: editData.owner } : null)
      setAnimalSearch(editData.animal ? `${editData.animal.animal_type}${editData.animal.breed?' · '+editData.animal.breed:''} — ${editData.owner?.name}` : '')
      setItems(editData.items?.length ? editData.items.map(i => ({
        medicine_name: i.medicine_name || '',
        medicine_id:   i.medicine_id   || '',
        dosage:        i.dosage        || '',
        frequency:     i.frequency     || '',
        duration:      i.duration      || '',
        route:         i.route         || 'Oral',
        instructions:  i.instructions  || '',
        quantity:      i.quantity      || '',
      })) : [{ ...EMPTY_ITEM }])
    } else {
      // If coming from appointment — pre-fill with appointment data
      const af = prefill || {}
      setForm({
        animal_id:       af.animal_id       || '',
        owner_id:        af.owner_id        || '',
        appointment_id:  af.appointment_id  || '',
        hospital_id:     af.hospital_id     || '',
        chief_complaint: af.chief_complaint || '',
        diagnosis:       '',
        notes:           '',
        follow_up_date:  '',
        ownerEmail:      af.owner?.email    || '',
      })
      setItems([{ ...EMPTY_ITEM }])
      if (af.animal) {
        setSelAnimal({ ...af.animal, owner: af.owner })
        setAnimalSearch(
          `${af.animal.animal_type}${af.animal.breed ? ' · '+af.animal.breed : ''}${af.animal.name ? ' "'+af.animal.name+'"' : ''} — ${af.owner?.name || ''}`
        )
        // Load previous prescriptions
        setLoadingPrevRx(true)
        setPrevRx([])
        prescriptionApi.list({ animal_id: af.animal_id, limit: 10 })
          .then(r => setPrevRx(r.data.data.prescriptions || []))
          .catch(() => {})
          .finally(() => setLoadingPrevRx(false))
      } else {
        setSelAnimal(null)
        setAnimalSearch('')
        setPrevRx([])
      }
    }
    setErrors({}); setApiErr('')
  }, [open, editData])

  function selectAnimal(a) {
    setSelAnimal(a)
    setForm(p => ({ ...p, animal_id: a.id, owner_id: a.owner?.id || '', ownerEmail: a.owner?.email || '', hospital_id: a.hospital?.id || a.hospital_id || p.hospital_id || '' }))
    setAnimalSearch(`${a.animal_type}${a.breed?' · '+a.breed:''} — ${a.owner?.name}`)
    setShowAnimalDrop(false)
    setAnimals([])
    // Load previous prescriptions for this animal
    setLoadingPrevRx(true)
    setPrevRx([])
    prescriptionApi.list({ animal_id: a.id, limit: 10 })
      .then(r => setPrevRx(r.data.data.prescriptions || []))
      .catch(() => {})
      .finally(() => setLoadingPrevRx(false))
  }

  function setItem(i, field, val) {
    setItems(p => p.map((it,idx) => idx===i ? { ...it, [field]:val } : it))
  }

  function addItem() { setItems(p => [...p, { ...EMPTY_ITEM }]) }
  function removeItem(i) { setItems(p => p.filter((_,idx) => idx!==i)) }

  async function handleSubmit() {
    const e = {}
    if (!form.animal_id)            e.animal_id = 'Select an animal'
    if (!items.some(i=>i.medicine_name.trim())) e.items = 'Add at least one medicine'
    if (Object.keys(e).length) { setErrors(e); return }

    setSaving(true)
    try {
      const payload = {
        animal_id:       form.animal_id,
        owner_id:        form.owner_id,
        appointment_id:  form.appointment_id  || undefined,
        hospital_id:     form.hospital_id     || undefined,
        chief_complaint: form.chief_complaint || undefined,
        diagnosis:       form.diagnosis       || undefined,
        notes:           form.notes           || undefined,
        follow_up_date:  form.follow_up_date  || undefined,
        items: items.filter(i => i.medicine_name.trim()).map(i => ({
          medicine_name: i.medicine_name.trim(),
          medicine_id:   i.medicine_id   || undefined,
          dosage:        i.dosage        || undefined,
          frequency:     i.frequency     || undefined,
          duration:      i.duration      || undefined,
          route:         i.route         || undefined,
          instructions:  i.instructions  || undefined,
          quantity:      i.quantity      ? parseInt(i.quantity) : undefined,
        })),
      }

      let rx
      if (isEdit) {
        const res = await prescriptionApi.update(editData.id, payload)
        rx = res.data.data
      } else {
        const res = await prescriptionApi.create(payload)
        rx = res.data.data
      }

      // Backend auto-sends email — but if ownerEmail provided, ensure it's set
      // (backend uses owner.email from DB; frontend email is just for confirmation)

      onSaved()
      onClose()
    } catch (err) {
      setApiErr(err?.response?.data?.message || 'Something went wrong')
    } finally { setSaving(false) }
  }

  if (!open) return null

  const ANIMAL_EMOJIS = { COW:'🐄',BUFFALO:'🐃',GOAT:'🐐',DOG:'🐕',CAMEL:'🐪',HORSE:'🐎',SHEEP:'🐑',OTHER:'🐾' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.35)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[94vh] flex flex-col animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <Stethoscope size={18} className="text-teal-600"/>
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-800">
                {isEdit ? 'Edit Prescription' : 'New Prescription'}
              </h2>
              <p className="text-xs text-slate-400">
                Dr. {user?.name}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {apiErr && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{apiErr}</div>}

          {/* Animal search */}
          <FLabel label="Patient (Animal)" required error={errors.animal_id}>
            <div className="relative">
              <input type="text" placeholder="Search by animal type, breed, owner name…"
                value={animalSearch}
                onChange={e => { setAnimalSearch(e.target.value); setShowAnimalDrop(true); setSelAnimal(null); setForm(p=>({...p,animal_id:'',owner_id:''})) }}
                onFocus={() => setShowAnimalDrop(true)}
                className={'input-base'+(errors.animal_id?' input-error':'')}/>
              {showAnimalDrop && animals.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
                  {animals.map(a => (
                    <button key={a.id} type="button" onClick={() => selectAnimal(a)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                      <p className="text-sm font-medium text-slate-800">
                        {ANIMAL_EMOJIS[a.animal_type]||'🐾'} {a.animal_type}{a.breed?' · '+a.breed:''}
                        {a.name?' "'+a.name+'"':''}
                      </p>
                      <p className="text-xs text-slate-400">{a.owner?.name} · {a.owner?.phone} · {a.hospital?.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selAnimal && (
              <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2 mt-1">
                <span className="text-xl">{ANIMAL_EMOJIS[selAnimal.animal_type]||'🐾'}</span>
                <div>
                  <p className="text-sm font-semibold text-teal-800">{selAnimal.animal_type}{selAnimal.breed?' · '+selAnimal.breed:''}</p>
                  <p className="text-xs text-teal-600">{selAnimal.owner?.name} · {selAnimal.owner?.phone}</p>
                </div>
                <button type="button" onClick={() => { setSelAnimal(null); setAnimalSearch(''); setForm(p=>({...p,animal_id:'',owner_id:''})) }}
                  className="ml-auto text-teal-400 hover:text-teal-600"><X size={14}/></button>
              </div>
            )}
          </FLabel>

          {/* Previous Prescriptions */}
          {(loadingPrevRx || prevRx.length > 0) && (
            <div className="border border-amber-200 rounded-xl overflow-hidden">
              <button type="button"
                onClick={() => setShowPrevRx(p => !p)}
                className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <span className="text-sm font-semibold text-amber-800">
                    Previous Prescriptions
                  </span>
                  {!loadingPrevRx && (
                    <span className="bg-amber-200 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
                      {prevRx.length}
                    </span>
                  )}
                </div>
                <span className="text-amber-600 text-xs font-medium">
                  {showPrevRx ? '▲ Hide' : '▼ View history'}
                </span>
              </button>

              {showPrevRx && (
                <div className="divide-y divide-amber-100 max-h-72 overflow-y-auto">
                  {loadingPrevRx ? (
                    <div className="px-4 py-6 text-center text-sm text-slate-400">Loading history…</div>
                  ) : prevRx.map((rx, i) => (
                    <div key={rx.id} className="px-4 py-3 bg-white hover:bg-amber-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-700">
                              {new Date(rx.createdAt||rx.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                            </span>
                            <span className="text-xs text-slate-400">Dr. {rx.doctor?.name}</span>
                            {rx.follow_up_date && (
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${new Date(rx.follow_up_date)<new Date()?'bg-red-100 text-red-600':'bg-green-100 text-green-600'}`}>
                                Follow-up: {rx.follow_up_date}
                              </span>
                            )}
                          </div>
                          {rx.diagnosis && (
                            <p className="text-xs font-semibold text-slate-700 mt-1">🔬 {rx.diagnosis}</p>
                          )}
                          {rx.chief_complaint && (
                            <p className="text-xs text-slate-500 mt-0.5">Complaint: {rx.chief_complaint}</p>
                          )}
                          {rx.items?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {rx.items.map((item, j) => (
                                <span key={j} className="text-xs bg-teal-50 border border-teal-200 text-teal-700 px-2 py-0.5 rounded-full">
                                  💊 {item.medicine_name}
                                  {item.dosage ? ' · '+item.dosage : ''}
                                  {item.duration ? ' · '+item.duration : ''}
                                </span>
                              ))}
                            </div>
                          )}
                          {rx.notes && (
                            <p className="text-xs text-slate-400 mt-1 italic">📝 {rx.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Complaint + Diagnosis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FLabel label="Chief Complaint">
              <textarea value={form.chief_complaint} onChange={e=>setForm(p=>({...p,chief_complaint:e.target.value}))}
                placeholder="What the owner reports…" rows={2} className="input-base resize-none"/>
            </FLabel>
            <FLabel label="Diagnosis">
              <textarea value={form.diagnosis} onChange={e=>setForm(p=>({...p,diagnosis:e.target.value}))}
                placeholder="Clinical diagnosis…" rows={2} className="input-base resize-none"/>
            </FLabel>
          </div>

          {/* Medicines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700">💊 Medicines / Treatment</label>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium">
                <Plus size={13}/> Add Medicine
              </button>
            </div>
            {errors.items && <p className="text-xs text-red-500 mb-2">{errors.items}</p>}

            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 w-5">#{i+1}</span>

                    {/* Medicine name with autocomplete */}
                    <div className="flex-1 relative">
                      <input list={`med-list-${i}`} placeholder="Medicine name *"
                        value={item.medicine_name}
                        onChange={e => setItem(i,'medicine_name',e.target.value)}
                        className="input-base text-sm h-8 w-full"/>
                      <datalist id={`med-list-${i}`}>
                        {medicines.map(m => <option key={m.id} value={m.name}/>)}
                      </datalist>
                    </div>

                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)}
                        className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-500 flex-shrink-0">
                        <Trash2 size={13}/>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 ml-7">
                    <div>
                      <label className="text-xs text-slate-400">Dosage</label>
                      <input placeholder="e.g. 500mg" value={item.dosage}
                        onChange={e=>setItem(i,'dosage',e.target.value)} className="input-base text-xs h-7 mt-0.5"/>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Frequency</label>
                      <select value={item.frequency} onChange={e=>setItem(i,'frequency',e.target.value)}
                        className="input-base text-xs h-7 mt-0.5">
                        <option value="">Select…</option>
                        {FREQUENCIES.map(f=><option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Duration</label>
                      <select value={item.duration} onChange={e=>setItem(i,'duration',e.target.value)}
                        className="input-base text-xs h-7 mt-0.5">
                        <option value="">Select…</option>
                        {DURATIONS.map(d=><option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Route</label>
                      <select value={item.route} onChange={e=>setItem(i,'route',e.target.value)}
                        className="input-base text-xs h-7 mt-0.5">
                        {ROUTES.map(r=><option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="ml-7">
                    <label className="text-xs text-slate-400">Special Instructions</label>
                    <input placeholder="e.g. Give with food, avoid direct sunlight…"
                      value={item.instructions} onChange={e=>setItem(i,'instructions',e.target.value)}
                      className="input-base text-xs h-7 mt-0.5 w-full"/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes + Follow-up */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FLabel label="Doctor's Notes">
              <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
                placeholder="Additional notes for owner…" rows={2} className="input-base resize-none"/>
            </FLabel>
            <FLabel label="Follow-up Date">
              <input type="date" value={form.follow_up_date}
                onChange={e=>setForm(p=>({...p,follow_up_date:e.target.value}))}
                min={new Date().toISOString().split('T')[0]}
                className="input-base"/>
            </FLabel>
          </div>

          {/* Email notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">📧</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-800">Auto-email to owner</p>
                <p className="text-xs text-blue-600 mt-0.5">Prescription will be automatically emailed to the owner after saving.</p>
                <input type="email" placeholder="Owner email (auto-filled if available)"
                  value={form.ownerEmail} onChange={e=>setForm(p=>({...p,ownerEmail:e.target.value}))}
                  className="input-base text-sm mt-2"/>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" loading={saving} onClick={handleSubmit} icon={form.sendEmail ? Send : undefined}>
            {isEdit ? 'Save Changes' : 'Save & Send Prescription'}
          </Button>
        </div>
      </div>
    </div>
  )
}
