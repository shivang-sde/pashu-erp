import { useState, useEffect } from 'react'
import { X, PawPrint, Phone, MapPin, Calendar, Syringe, AlertCircle, Plus, Loader2 } from 'lucide-react'
import { animalApi } from '../../api/animals.js'
import { Button } from '../ui/Button.jsx'

const ANIMAL_EMOJIS = { COW:'🐄', BUFFALO:'🐃', GOAT:'🐐', DOG:'🐕', CAMEL:'🐪', HORSE:'🐎', SHEEP:'🐑', OTHER:'🐾' }

function Section({ title, icon: Icon, children, action }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-slate-500"/>
          <span className="text-sm font-semibold text-slate-700">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function KV({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="text-xs text-slate-400 w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-700 font-medium">{value}</span>
    </div>
  )
}

function DiseaseForm({ animalId, onAdded }) {
  const [form,  setForm]  = useState({ disease_name:'', symptoms:'', treatment:'', diagnosed_at:'', status:'ACTIVE' })
  const [saving,setSaving]= useState(false)
  function set(f) { return e => setForm(p=>({...p,[f]:e.target.value})) }
  async function submit(e) {
    e.preventDefault()
    if (!form.disease_name) return
    setSaving(true)
    try { await animalApi.addDisease(animalId, form); onAdded() }
    catch { /* ignore */ } finally { setSaving(false) }
  }
  return (
    <form onSubmit={submit} className="space-y-2 mt-3 pt-3 border-t border-slate-100 animate-fade-in">
      <input placeholder="Disease name *" value={form.disease_name} onChange={set('disease_name')} required className="input-base text-sm"/>
      <textarea placeholder="Symptoms" value={form.symptoms} onChange={set('symptoms')} rows={2} className="input-base text-sm resize-none"/>
      <textarea placeholder="Treatment given" value={form.treatment} onChange={set('treatment')} rows={2} className="input-base text-sm resize-none"/>
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={form.diagnosed_at} onChange={set('diagnosed_at')} className="input-base text-sm"/>
        <select value={form.status} onChange={set('status')} className="input-base text-sm">
          <option value="ACTIVE">Active</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CHRONIC">Chronic</option>
        </select>
      </div>
      <Button type="submit" size="sm" fullWidth loading={saving}>Save Disease Record</Button>
    </form>
  )
}

function VaccForm({ animalId, onAdded }) {
  const [form,  setForm]  = useState({ vaccine_name:'', disease_prevented:'', batch_number:'', dose:'', vaccinated_at:'', next_due_at:'' })
  const [saving,setSaving]= useState(false)
  function set(f) { return e => setForm(p=>({...p,[f]:e.target.value})) }
  async function submit(e) {
    e.preventDefault()
    if (!form.vaccine_name || !form.vaccinated_at) return
    setSaving(true)
    try { await animalApi.addVaccination(animalId, form); onAdded() }
    catch { /* ignore */ } finally { setSaving(false) }
  }
  return (
    <form onSubmit={submit} className="space-y-2 mt-3 pt-3 border-t border-slate-100 animate-fade-in">
      <input placeholder="Vaccine name *" value={form.vaccine_name} onChange={set('vaccine_name')} required className="input-base text-sm"/>
      <input placeholder="Disease prevented" value={form.disease_prevented} onChange={set('disease_prevented')} className="input-base text-sm"/>
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="Batch number" value={form.batch_number} onChange={set('batch_number')} className="input-base text-sm"/>
        <input placeholder="Dose (e.g. 2ml)" value={form.dose} onChange={set('dose')} className="input-base text-sm"/>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">Date *</label><input type="date" value={form.vaccinated_at} onChange={set('vaccinated_at')} required className="input-base text-sm"/></div>
        <div className="flex flex-col gap-1"><label className="text-xs text-slate-400">Next due</label><input type="date" value={form.next_due_at} onChange={set('next_due_at')} className="input-base text-sm"/></div>
      </div>
      <Button type="submit" size="sm" fullWidth loading={saving}>Save Vaccination</Button>
    </form>
  )
}

export function AnimalDetailDrawer({ animalId, open, onClose }) {
  const [animal,      setAnimal]      = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [showDisForm, setShowDisForm] = useState(false)
  const [showVaxForm, setShowVaxForm] = useState(false)

  async function loadAnimal() {
    if (!animalId) return
    setLoading(true)
    try {
      const res = await animalApi.getOne(animalId)
      setAnimal(res.data.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (open && animalId) { setShowDisForm(false); setShowVaxForm(false); loadAnimal() }
  }, [open, animalId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose}/>
      <div className="relative w-full max-w-md bg-pashu-bg h-full overflow-y-auto shadow-xl animate-slide-in flex flex-col">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{animal ? ANIMAL_EMOJIS[animal.animal_type]||'🐾' : '🐾'}</div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-800">
                {loading ? 'Loading…' : (animal?.name || animal?.breed || animal?.animal_type || 'Animal Details')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{animal?.animal_type} {animal?.breed ? `· ${animal.breed}` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-slate-300"/></div>
        ) : !animal ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Failed to load</div>
        ) : (
          <div className="flex-1 p-4 space-y-3">

            {/* Animal info */}
            <Section title="Animal Information" icon={PawPrint}>
              <KV label="Type"    value={`${ANIMAL_EMOJIS[animal.animal_type]} ${animal.animal_type}`}/>
              <KV label="Breed"   value={animal.breed}/>
              <KV label="Gender"  value={animal.gender}/>
              <KV label="Age"     value={[animal.age_years && `${animal.age_years}y`, animal.age_months && `${animal.age_months}m`].filter(Boolean).join(' ') || null}/>
              <KV label="Weight"  value={animal.weight_kg ? `${animal.weight_kg} kg` : null}/>
              <KV label="Color"   value={animal.color}/>
              <KV label="Status"  value={animal.status}/>
              {animal.notes && <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-2">{animal.notes}</div>}
            </Section>

            {/* ID Tags */}
            {(animal.ear_tag || animal.rfid_tag || animal.qr_code) && (
              <Section title="Identification Tags" icon={AlertCircle}>
                <KV label="Ear Tag"  value={animal.ear_tag}/>
                <KV label="RFID Tag" value={animal.rfid_tag}/>
                <KV label="QR Code"  value={animal.qr_code}/>
              </Section>
            )}

            {/* Owner */}
            <Section title="Owner Details" icon={Phone}>
              <KV label="Name"    value={animal.owner?.name}/>
              <KV label="Phone"   value={animal.owner?.phone}/>
              <KV label="Village" value={animal.owner?.village}/>
              <KV label="Address" value={animal.owner?.address}/>
            </Section>

            {/* Disease history */}
            <Section title={`Disease History (${animal.diseases?.length||0})`} icon={AlertCircle}
              action={<button onClick={() => setShowDisForm(f=>!f)}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium">
                <Plus size={13}/>{showDisForm ? 'Cancel' : 'Add'}
              </button>}>
              {showDisForm && <DiseaseForm animalId={animal.id} onAdded={() => { loadAnimal(); setShowDisForm(false) }}/>}
              {!animal.diseases?.length && !showDisForm ? (
                <p className="text-xs text-slate-400 text-center py-4">No disease records</p>
              ) : animal.diseases?.map(d => (
                <div key={d.id} className="border border-slate-100 rounded-xl p-3 mb-2 last:mb-0">
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-semibold text-slate-800">{d.disease_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium
                      ${d.status==='ACTIVE' ? 'bg-red-50 text-red-600 border-red-200'
                      : d.status==='CHRONIC' ? 'bg-amber-50 text-amber-600 border-amber-200'
                      : 'bg-green-50 text-green-600 border-green-200'}`}>{d.status}</span>
                  </div>
                  {d.symptoms  && <p className="text-xs text-slate-500 mt-1"><b>Symptoms:</b> {d.symptoms}</p>}
                  {d.treatment && <p className="text-xs text-slate-500 mt-0.5"><b>Treatment:</b> {d.treatment}</p>}
                  {d.diagnosed_at && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Calendar size={10}/>{new Date(d.diagnosed_at).toLocaleDateString('en-IN')}
                      {d.doctor && ` · Dr. ${d.doctor.name}`}
                    </p>
                  )}
                </div>
              ))}
            </Section>

            {/* Vaccinations */}
            <Section title={`Vaccinations (${animal.vaccinations?.length||0})`} icon={Syringe}
              action={<button onClick={() => setShowVaxForm(f=>!f)}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium">
                <Plus size={13}/>{showVaxForm ? 'Cancel' : 'Add'}
              </button>}>
              {showVaxForm && <VaccForm animalId={animal.id} onAdded={() => { loadAnimal(); setShowVaxForm(false) }}/>}
              {!animal.vaccinations?.length && !showVaxForm ? (
                <p className="text-xs text-slate-400 text-center py-4">No vaccination records</p>
              ) : animal.vaccinations?.map(v => (
                <div key={v.id} className="border border-slate-100 rounded-xl p-3 mb-2 last:mb-0">
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-semibold text-slate-800">{v.vaccine_name}</span>
                    {v.next_due_at && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium
                        ${new Date(v.next_due_at) < new Date() ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                        Due {new Date(v.next_due_at).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </div>
                  {v.disease_prevented && <p className="text-xs text-slate-500 mt-0.5">Prevents: {v.disease_prevented}</p>}
                  {v.dose             && <p className="text-xs text-slate-500">Dose: {v.dose}</p>}
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Calendar size={10}/>{new Date(v.vaccinated_at).toLocaleDateString('en-IN')}
                    {v.administrator && ` · Dr. ${v.administrator.name}`}
                    {v.batch_number  && ` · Batch: ${v.batch_number}`}
                  </p>
                </div>
              ))}
            </Section>

          </div>
        )}
      </div>
    </div>
  )
}
