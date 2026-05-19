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
    animal_id:'', owner_id:'', appointment_id:'',
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
  const [animalSearch, setAnimalSearch] = useState('')
  const [showAnimalDrop, setShowAnimalDrop] = useState(false)

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
        chief_complaint:editData.chief_complaint|| '',
        diagnosis:      editData.diagnosis      || '',
        notes:          editData.notes          || '',
        follow_up_date: editData.follow_up_date || '',
        sendEmail:      false,
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
        chief_complaint: af.chief_complaint || '',
        diagnosis:       '',
        notes:           '',
        follow_up_date:  '',
        sendEmail:       true,
        ownerEmail:      af.owner?.email    || '',
      })
      setItems([{ ...EMPTY_ITEM }])
      if (af.animal) {
        setSelAnimal({ ...af.animal, owner: af.owner })
        setAnimalSearch(
          `${af.animal.animal_type}${af.animal.breed ? ' · '+af.animal.breed : ''}${af.animal.name ? ' "'+af.animal.name+'"' : ''} — ${af.owner?.name || ''}`
        )
      } else {
        setSelAnimal(null)
        setAnimalSearch('')
      }
    }
    setErrors({}); setApiErr('')
  }, [open, editData])

  function selectAnimal(a) {
    setSelAnimal(a)
    setForm(p => ({ ...p, animal_id: a.id, owner_id: a.owner?.id || '', ownerEmail: a.owner?.email || '' }))
    setAnimalSearch(`${a.animal_type}${a.breed?' · '+a.breed:''} — ${a.owner?.name}`)
    setShowAnimalDrop(false)
    setAnimals([])
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
        appointment_id:  form.appointment_id || undefined,
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

      // Send email if requested
      if (form.sendEmail && rx?.id) {
        const emailTo = form.ownerEmail || selAnimal?.owner?.email
        if (emailTo) {
          await prescriptionApi.sendEmail(rx.id, { email: emailTo }).catch(() => {})
        }
      }

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

          {/* Email option */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="sendEmail" checked={form.sendEmail}
                onChange={e=>setForm(p=>({...p,sendEmail:e.target.checked}))}
                className="w-4 h-4 accent-blue-600"/>
              <label htmlFor="sendEmail" className="text-sm font-medium text-blue-800 cursor-pointer">
                📧 Send prescription to owner by email
              </label>
            </div>
            {form.sendEmail && (
              <input type="email" placeholder="Owner email address"
                value={form.ownerEmail} onChange={e=>setForm(p=>({...p,ownerEmail:e.target.value}))}
                className="input-base text-sm"/>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" loading={saving} onClick={handleSubmit} icon={form.sendEmail ? Send : undefined}>
            {isEdit ? 'Save Changes' : form.sendEmail ? 'Save & Send Email' : 'Save Prescription'}
          </Button>
        </div>
      </div>
    </div>
  )
}
