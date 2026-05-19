import { useState, useEffect } from 'react'
import { X, CalendarDays, AlertTriangle } from 'lucide-react'
import { appointmentApi } from '../../api/appointments.js'
import { animalApi }      from '../../api/animals.js'
import { hospitalApi }    from '../../api/hospitals.js'
import { Button } from '../ui/Button.jsx'

const APPT_TYPES = [
  { value:'REGULAR',     label:'Regular',     color:'bg-blue-50 text-blue-700' },
  { value:'EMERGENCY',   label:'Emergency',   color:'bg-red-50 text-red-700' },
  { value:'FOLLOW_UP',   label:'Follow-up',   color:'bg-purple-50 text-purple-700' },
  { value:'VACCINATION', label:'Vaccination', color:'bg-green-50 text-green-700' },
]

const EMPTY = {
  animal_id:'', hospital_id:'', doctor_id:'',
  appointment_date:'', appointment_time:'',
  type:'REGULAR', chief_complaint:'', notes:'',
}

// All helpers outside component to prevent remount
function FLabel({ label, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function ErrMsg({ error }) {
  if (!error) return null
  return <p className="text-xs text-red-500 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500 inline-block"/>{error}</p>
}

export function AppointmentModal({ open, onClose, onSaved, editData }) {
  const [form,     setForm]     = useState(EMPTY)
  const [errors,   setErrors]   = useState({})
  const [saving,   setSaving]   = useState(false)
  const [apiErr,   setApiErr]   = useState('')
  const [animals,  setAnimals]  = useState([])
  const [hospitals,setHospitals]= useState([])
  const [doctors,  setDoctors]  = useState([])
  const [animalSearch, setAnimalSearch] = useState('')

  const isEdit = !!editData

  // Load hospitals once
  useEffect(() => {
    hospitalApi.list({ limit:100, status:'ACTIVE' })
      .then(r => setHospitals(r.data.data.hospitals || []))
      .catch(() => {})
  }, [])

  // Load doctors when hospital changes
  useEffect(() => {
    if (!form.hospital_id) { setDoctors([]); return }
    appointmentApi.getAvailableDoctors(form.hospital_id)
      .then(r => setDoctors(r.data.data || []))
      .catch(() => {})
  }, [form.hospital_id])

  // Search animals
  useEffect(() => {
    if (animalSearch.length < 2) { setAnimals([]); return }
    const t = setTimeout(() => {
      animalApi.list({ search: animalSearch, limit:10 })
        .then(r => setAnimals(r.data.data.animals || []))
        .catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [animalSearch])

  // Populate edit data
  useEffect(() => {
    if (!open) return
    if (editData) {
      setForm({
        animal_id:        editData.animal_id    || '',
        hospital_id:      editData.hospital_id  || '',
        doctor_id:        editData.doctor_id    || '',
        appointment_date: editData.appointment_date || '',
        appointment_time: editData.appointment_time || '',
        type:             editData.type         || 'REGULAR',
        chief_complaint:  editData.chief_complaint || '',
        notes:            editData.notes        || '',
      })
      if (editData.animal) setAnimals([editData.animal])
    } else {
      setForm({ ...EMPTY, appointment_date: new Date().toISOString().split('T')[0] })
      setAnimals([])
      setAnimalSearch('')
    }
    setErrors({})
    setApiErr('')
  }, [open, editData])

  function set(field) {
    return e => {
      const val = e?.target ? e.target.value : e
      setForm(p => ({ ...p, [field]: val }))
      setErrors(p => ({ ...p, [field]:'' }))
      setApiErr('')
    }
  }

  function validate() {
    const e = {}
    if (!form.animal_id)        e.animal_id        = 'Select an animal'
    if (!form.hospital_id)      e.hospital_id      = 'Select a hospital'
    if (!form.appointment_date) e.appointment_date = 'Date is required'
    return e
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      if (isEdit) await appointmentApi.update(editData.id, form)
      else        await appointmentApi.create(form)
      onSaved()
      onClose()
    } catch (err) {
      setApiErr(err?.response?.data?.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const ANIMAL_EMOJIS = { COW:'🐄', BUFFALO:'🐃', GOAT:'🐐', DOG:'🐕', CAMEL:'🐪', HORSE:'🐎', SHEEP:'🐑', OTHER:'🐾' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.35)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <CalendarDays size={18} className="text-blue-600"/>
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-800">
                {isEdit ? 'Edit Appointment' : 'Book Appointment'}
              </h2>
              <p className="text-xs text-slate-400">{isEdit ? 'Update appointment details' : 'New animal appointment'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          {apiErr && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{apiErr}</div>}

          {/* Type selector */}
          <FLabel label="Appointment Type">
            <div className="grid grid-cols-4 gap-2">
              {APPT_TYPES.map(t => (
                <button key={t.value} type="button"
                  onClick={() => setForm(p => ({ ...p, type: t.value }))}
                  className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all
                    ${form.type === t.value ? `${t.color} border-current` : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {t.value === 'EMERGENCY' && '🚨 '}
                  {t.label}
                </button>
              ))}
            </div>
            {form.type === 'EMERGENCY' && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-1">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0"/>
                <p className="text-xs text-red-700">Emergency cases are given highest priority — no token number assigned.</p>
              </div>
            )}
          </FLabel>

          {/* Animal search */}
          <FLabel label="Animal Patient" required>
            <input type="text" placeholder="Search by name, breed, ear tag, owner phone…"
              value={animalSearch}
              onChange={e => { setAnimalSearch(e.target.value); if (!e.target.value) { setForm(p=>({...p,animal_id:''})) } }}
              className={`input-base ${errors.animal_id ? 'input-error' : ''}`}/>
            {animals.length > 0 && !form.animal_id && (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto mt-1">
                {animals.map(a => (
                  <button key={a.id} type="button"
                    onClick={() => { setForm(p=>({...p,animal_id:a.id})); setAnimalSearch(`${ANIMAL_EMOJIS[a.animal_type]||'🐾'} ${a.animal_type}${a.breed?` · ${a.breed}`:''}${a.name?` "${a.name}"`:''}`) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left border-b border-slate-100 last:border-0">
                    <span className="text-xl">{ANIMAL_EMOJIS[a.animal_type]||'🐾'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700">{a.animal_type}{a.breed?` · ${a.breed}`:''}{a.name?` "${a.name}"`:''}
                        {a.ear_tag && <span className="ml-1 text-xs text-slate-400">🏷️{a.ear_tag}</span>}
                      </p>
                      <p className="text-xs text-slate-400">{a.owner?.name} · {a.owner?.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {form.animal_id && (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2 mt-1">
                <span className="text-xs text-green-700 font-medium">✓ Animal selected</span>
                <button type="button" onClick={() => { setForm(p=>({...p,animal_id:''})); setAnimalSearch('') }} className="text-xs text-green-600 hover:text-green-800">Change</button>
              </div>
            )}
            <ErrMsg error={errors.animal_id}/>
          </FLabel>

          {/* Hospital */}
          <FLabel label="Hospital" required>
            <select value={form.hospital_id} onChange={set('hospital_id')} className={`input-base ${errors.hospital_id?'input-error':''}`}>
              <option value="">Select hospital…</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <ErrMsg error={errors.hospital_id}/>
          </FLabel>

          {/* Doctor */}
          <FLabel label="Assign Doctor (optional)">
            <select value={form.doctor_id} onChange={set('doctor_id')} className="input-base" disabled={!form.hospital_id}>
              <option value="">Select doctor… (can be assigned later)</option>
              {doctors.map(d => {
                const specs = Array.isArray(d.specializations) ? d.specializations : []
                return <option key={d.id} value={d.id}>{d.name}{specs.length ? ` · ${specs.slice(0,2).join(', ')}` : ''}</option>
              })}
            </select>
          </FLabel>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <FLabel label="Date" required>
              <input type="date" value={form.appointment_date} onChange={set('appointment_date')}
                className={`input-base ${errors.appointment_date?'input-error':''}`}
                min={new Date().toISOString().split('T')[0]}/>
              <ErrMsg error={errors.appointment_date}/>
            </FLabel>
            <FLabel label="Preferred Time">
              <input type="time" value={form.appointment_time} onChange={set('appointment_time')} className="input-base"/>
            </FLabel>
          </div>

          {/* Chief complaint */}
          <FLabel label="Chief Complaint">
            <textarea value={form.chief_complaint} onChange={set('chief_complaint')} rows={2}
              placeholder="Describe the main reason for visit…" className="input-base resize-none"/>
          </FLabel>

          <FLabel label="Notes">
            <textarea value={form.notes} onChange={set('notes')} rows={2}
              placeholder="Additional notes…" className="input-base resize-none"/>
          </FLabel>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>{isEdit ? 'Save Changes' : 'Book Appointment'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
