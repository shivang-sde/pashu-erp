import { useState, useEffect } from 'react'
import { X, PawPrint, ChevronRight, ChevronLeft } from 'lucide-react'
import { animalApi }   from '../../api/animals.js'
import { hospitalApi } from '../../api/hospitals.js'
import { Button } from '../ui/Button.jsx'

const ANIMAL_TYPES  = ['COW','BUFFALO','GOAT','DOG','CAMEL','HORSE','SHEEP','OTHER']
const ANIMAL_EMOJIS = { COW:'🐄',BUFFALO:'🐃',GOAT:'🐐',DOG:'🐕',CAMEL:'🐪',HORSE:'🐎',SHEEP:'🐑',OTHER:'🐾' }

const EMPTY = {
  // Owner
  owner_name:'', owner_phone:'', owner_email:'', owner_village:'', owner_address:'',
  owner_state:'', owner_district_id:'',
  // Animal
  animal_type:'COW', breed:'', name:'', gender:'UNKNOWN',
  age_years:'', age_months:'', weight_kg:'', color:'',
  ear_tag:'', rfid_tag:'', hospital_id:'', status:'ACTIVE', notes:'',
}

function FLabel({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500 inline-block"/>{error}</p>}
    </div>
  )
}

function Field({ label, required, error, type='text', placeholder, value, onChange, children, as }) {
  if (as === 'select') return (
    <FLabel label={label} required={required} error={error}>
      <select value={value} onChange={onChange} className={'input-base'+(error?' input-error':'')}>
        {children}
      </select>
    </FLabel>
  )
  if (as === 'textarea') return (
    <FLabel label={label} required={required} error={error}>
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={2} className="input-base resize-none"/>
    </FLabel>
  )
  return (
    <FLabel label={label} required={required} error={error}>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className={'input-base'+(error?' input-error':'')}/>
    </FLabel>
  )
}

const STEPS = [
  { id:'owner',  label:'Owner Info',   emoji:'👤' },
  { id:'animal', label:'Animal Info',  emoji:'🐾' },
  { id:'id',     label:'ID & Tags',    emoji:'🏷️' },
]

export function AnimalModal({ open, onClose, onSaved, editData, hospitals = [] }) {
  const [form,         setForm]         = useState(EMPTY)
  const [errors,       setErrors]       = useState({})
  const [saving,       setSaving]       = useState(false)
  const [apiErr,       setApiErr]       = useState('')
  const [step,         setStep]         = useState(0)   // 0=owner, 1=animal, 2=id
  const [allDists,     setAllDists]     = useState([])
  const [states,       setStates]       = useState([])
  const [filteredDists,setFilteredDists]= useState([])
  const [filteredHosps,setFilteredHosps]= useState([])
  const [allHospitals, setAllHospitals]  = useState([])

  const isEdit = !!editData

  // Load all hospitals once on mount
  useEffect(() => {
    hospitalApi.list({ limit:2000, status:'ACTIVE' })
      .then(r => setAllHospitals(r.data.data.hospitals || []))
      .catch(() => {})
  }, [])

  // Load districts once
  useEffect(() => {
    hospitalApi.getAllDistricts().then(r => {
      const list = r.data.data || []
      setAllDists(list)
      setStates([...new Set(list.map(d => d.state).filter(Boolean))].sort())
    }).catch(() => {})
  }, [])

  // Filter districts when state changes
  useEffect(() => {
    if (form.owner_state) {
      setFilteredDists(allDists.filter(d => d.state === form.owner_state))
    } else {
      setFilteredDists([])
    }
  }, [form.owner_state, allDists])

  // Filter hospitals via API when district/state changes
  useEffect(() => {
    if (form.owner_district_id) {
      // Most precise: filter by district_id via API
      hospitalApi.list({ limit:500, status:'ACTIVE', district_id: form.owner_district_id })
        .then(r => setFilteredHosps(r.data.data.hospitals || []))
        .catch(() => setFilteredHosps([]))
    } else if (form.owner_state) {
      // Filter by state: get all districts in this state, then fetch hospitals for each
      const stateDistIds = filteredDists.map(d => d.id)
      if (stateDistIds.length) {
        // Fetch hospitals for all districts in the state and merge
        Promise.all(
          stateDistIds.slice(0, 5).map(did =>  // limit to 5 districts to avoid too many calls
            hospitalApi.list({ limit:200, status:'ACTIVE', district_id: did })
              .then(r => r.data.data.hospitals || [])
              .catch(() => [])
          )
        ).then(results => {
          const merged = results.flat()
          const unique = Array.from(new Map(merged.map(h => [h.id, h])).values())
          setFilteredHosps(unique)
        })
      } else {
        setFilteredHosps(allHospitals)
      }
    } else {
      setFilteredHosps(allHospitals)
    }
  }, [form.owner_district_id, form.owner_state, filteredDists])

  // Populate form on open
  useEffect(() => {
    if (!open) return
    if (editData) {
      setForm({
        owner_name:        editData.owner?.name             || '',
        owner_phone:       editData.owner?.phone            || '',
        owner_email:       editData.owner?.email            || '',
        owner_village:     editData.owner?.village          || '',
        owner_address:     editData.owner?.address          || '',
        owner_state:       editData.owner?.district?.state  || '',
        owner_district_id: editData.owner?.district_id      || '',
        animal_type:       editData.animal_type             || 'COW',
        breed:             editData.breed                   || '',
        name:              editData.name                    || '',
        gender:            editData.gender                  || 'UNKNOWN',
        age_years:         editData.age_years               ?? '',
        age_months:        editData.age_months              ?? '',
        weight_kg:         editData.weight_kg               ?? '',
        color:             editData.color                   || '',
        ear_tag:           editData.ear_tag                 || '',
        rfid_tag:          editData.rfid_tag                || '',
        hospital_id:       editData.hospital?.id            || editData.hospital_id || '',
        status:            editData.status                  || 'ACTIVE',
        notes:             editData.notes                   || '',
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({}); setApiErr(''); setStep(0)
  }, [open, editData])

  function set(field) {
    return e => {
      const val = e?.target ? e.target.value : e
      setForm(p => ({ ...p, [field]: val }))
      setErrors(p => ({ ...p, [field]: '' }))
      setApiErr('')
    }
  }

  function handleStateChange(val) {
    setForm(p => ({ ...p, owner_state: val, owner_district_id: '', hospital_id: '' }))
    setFilteredHosps([])
  }

  function handleDistrictChange(val) {
    setForm(p => ({ ...p, owner_district_id: val, hospital_id: '' }))
  }

  // Validate step 0 (owner)
  function validateOwner() {
    const e = {}
    if (!form.owner_name.trim())  e.owner_name  = 'Owner name is required'
    if (!form.owner_phone.trim()) e.owner_phone = 'Mobile number is required'
    else if (!/^[6-9]\d{9}$/.test(form.owner_phone.replace(/\s/g,'')))
                                  e.owner_phone = 'Enter valid 10-digit mobile'
    if (!form.owner_state)        e.owner_state = 'State is required'
    if (!form.owner_district_id)  e.owner_district_id = 'District is required'
    return e
  }

  // Validate step 1 (animal)
  function validateAnimal() {
    const e = {}
    if (!form.animal_type)   e.animal_type  = 'Animal type is required'
    if (!form.hospital_id)   e.hospital_id  = 'Hospital is required'
    return e
  }

  function handleNext() {
    if (step === 0) {
      const e = validateOwner()
      if (Object.keys(e).length) { setErrors(e); return }
    }
    if (step === 1) {
      const e = validateAnimal()
      if (Object.keys(e).length) { setErrors(e); return }
    }
    setStep(s => s + 1)
  }

  async function handleSubmit() {
    const e1 = validateOwner()
    const e2 = validateAnimal()
    const allErr = { ...e1, ...e2 }
    if (Object.keys(allErr).length) {
      setErrors(allErr)
      if (Object.keys(e1).length) setStep(0)
      else setStep(1)
      return
    }
    setSaving(true)
    try {
      // Build clean payload matching backend field names
      const payload = {
        // Owner fields
        owner_name:        form.owner_name,
        owner_phone:       form.owner_phone,
        owner_email:       form.owner_email       || undefined,
        owner_address:     form.owner_address     || undefined,
        owner_village:     form.owner_village     || undefined,
        owner_district_id: form.owner_district_id || undefined,
        // Animal fields
        animal_type:  form.animal_type,
        breed:        form.breed        || undefined,
        name:         form.name         || undefined,
        gender:       form.gender,
        age_years:    form.age_years    || undefined,
        age_months:   form.age_months   || undefined,
        weight_kg:    form.weight_kg    || undefined,
        color:        form.color        || undefined,
        ear_tag:      form.ear_tag      || undefined,
        rfid_tag:     form.rfid_tag     || undefined,
        hospital_id:  form.hospital_id  || undefined,
        status:       form.status,
        notes:        form.notes        || undefined,
      }
      if (isEdit) await animalApi.update(editData.id, payload)
      else        await animalApi.create(payload)
      onSaved()
      onClose()
    } catch (err) {
      setApiErr(err?.response?.data?.message || 'Something went wrong')
    } finally { setSaving(false) }
  }

  if (!open) return null

  // If district/state selected: show filtered only (even if empty)
  // If nothing selected: show all
  const displayHospitals = (form.owner_district_id || form.owner_state)
    ? filteredHosps
    : allHospitals

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.35)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <PawPrint size={18} className="text-teal-600"/>
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-800">
                {isEdit ? 'Edit Animal' : 'Register Animal Patient'}
              </h2>
              <p className="text-xs text-slate-400">{STEPS[step].emoji} Step {step+1} of {STEPS.length} — {STEPS[step].label}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-6 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button type="button" onClick={() => { if(i < step || isEdit) setStep(i) }}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors
                  ${step === i ? 'bg-primary-600 text-white' : i < step ? 'text-primary-600 hover:bg-primary-50 cursor-pointer' : 'text-slate-400 cursor-default'}`}>
                <span>{s.emoji}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight size={14} className="text-slate-300 mx-1"/>
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {apiErr && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{apiErr}</div>
          )}

          {/* ── STEP 0: OWNER INFO ─────────────────────────────── */}
          {step === 0 && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                💡 If the mobile number already exists, the owner will be linked automatically.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Owner Name" required error={errors.owner_name}
                  value={form.owner_name} onChange={set('owner_name')} placeholder="Full name"/>
                <Field label="Mobile Number" required error={errors.owner_phone}
                  type="tel" value={form.owner_phone} onChange={set('owner_phone')} placeholder="10-digit mobile"/>
                <Field label="Email" type="email"
                  value={form.owner_email} onChange={set('owner_email')} placeholder="owner@email.com"/>
                <Field label="Village / Area"
                  value={form.owner_village} onChange={set('owner_village')} placeholder="Village name"/>
              </div>

              {/* State → District */}
              <div className="grid grid-cols-2 gap-3">
                <FLabel label="State" required error={errors.owner_state}>
                  <select value={form.owner_state} onChange={e => handleStateChange(e.target.value)}
                    className={'input-base'+(errors.owner_state?' input-error':'')}>
                    <option value="">Select state…</option>
                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FLabel>
                <FLabel label="District" required error={errors.owner_district_id}>
                  <select value={form.owner_district_id} onChange={e => handleDistrictChange(e.target.value)}
                    disabled={!form.owner_state || !filteredDists.length}
                    className={'input-base'+(errors.owner_district_id?' input-error':'')+((!form.owner_state)?' opacity-50':'')}>
                    <option value="">{form.owner_state ? 'Select district…' : 'Select state first'}</option>
                    {filteredDists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </FLabel>
              </div>

              <Field label="Address" as="textarea"
                value={form.owner_address} onChange={set('owner_address')} placeholder="Full address…"/>
            </>
          )}

          {/* ── STEP 1: ANIMAL INFO ─────────────────────────────── */}
          {step === 1 && (
            <>
              {/* Hospital — filtered by district selected in step 0 */}
              <FLabel label="Assigned Hospital" required error={errors.hospital_id}>
                <select value={form.hospital_id} onChange={set('hospital_id')}
                  className={'input-base'+(errors.hospital_id?' input-error':'')}>
                  <option value="">
                    {form.owner_district_id
                      ? `Select hospital in district… (${filteredHosps.length} available)`
                      : form.owner_state
                        ? `Select hospital in ${form.owner_state}… (${filteredHosps.length} available)`
                        : 'Select hospital…'}
                  </option>
                  {displayHospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
                {filteredHosps.length > 0 && form.owner_district_id && (
                  <p className="text-xs text-green-600 mt-1">✓ {filteredHosps.length} hospital{filteredHosps.length>1?'s':''} in selected district</p>
                )}
                {filteredHosps.length === 0 && form.owner_district_id && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ No hospitals found in this district</p>
                )}
              </FLabel>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Animal Type" required as="select" error={errors.animal_type}
                  value={form.animal_type} onChange={set('animal_type')}>
                  {ANIMAL_TYPES.map(t => <option key={t} value={t}>{ANIMAL_EMOJIS[t]} {t}</option>)}
                </Field>
                <Field label="Gender" as="select" value={form.gender} onChange={set('gender')}>
                  <option value="UNKNOWN">Unknown</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </Field>
                <Field label="Breed"        value={form.breed}      onChange={set('breed')}      placeholder="e.g. Gir, HF Cross"/>
                <Field label="Pet Name"     value={form.name}       onChange={set('name')}       placeholder="If any"/>
                <Field label="Age (Years)"  type="number" value={form.age_years}  onChange={set('age_years')}  placeholder="0"/>
                <Field label="Age (Months)" type="number" value={form.age_months} onChange={set('age_months')} placeholder="0"/>
                <Field label="Weight (kg)"  type="number" value={form.weight_kg}  onChange={set('weight_kg')}  placeholder="e.g. 250"/>
                <Field label="Color"        value={form.color}      onChange={set('color')}      placeholder="e.g. Black & White"/>
              </div>

              <Field label="Status" as="select" value={form.status} onChange={set('status')}>
                <option value="ACTIVE">Active</option>
                <option value="DECEASED">Deceased</option>
                <option value="TRANSFERRED">Transferred</option>
              </Field>

              <Field label="Notes" as="textarea" value={form.notes} onChange={set('notes')} placeholder="Any additional notes…"/>
            </>
          )}

          {/* ── STEP 2: ID TAGS ─────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
                🏷️ ID tags are optional but help track the animal uniquely across hospitals.
              </div>
              <Field label="Ear Tag Number" value={form.ear_tag}  onChange={set('ear_tag')}  placeholder="e.g. GJ-AMD-00123"/>
              <Field label="RFID Tag"       value={form.rfid_tag} onChange={set('rfid_tag')} placeholder="RFID chip number"/>

              {/* Summary */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Registration Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-slate-400">Owner</span><span className="font-medium">{form.owner_name}</span>
                  <span className="text-slate-400">Mobile</span><span className="font-medium">{form.owner_phone}</span>
                  <span className="text-slate-400">District</span><span className="font-medium">{filteredDists.find(d=>d.id===form.owner_district_id)?.name || '—'}</span>
                  <span className="text-slate-400">Animal</span><span className="font-medium">{ANIMAL_EMOJIS[form.animal_type]} {form.animal_type}{form.breed?' · '+form.breed:''}</span>
                  <span className="text-slate-400">Hospital</span><span className="font-medium">{displayHospitals.find(h=>h.id===form.hospital_id)?.name || '—'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <Button type="button" variant="secondary" onClick={() => step > 0 ? setStep(s=>s-1) : onClose()}>
            {step > 0 ? <><ChevronLeft size={14}/> Back</> : 'Cancel'}
          </Button>
          <div className="flex items-center gap-2">
            {/* Step dots */}
            <div className="flex gap-1.5 mr-2">
              {STEPS.map((_,i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i===step?'bg-primary-600':i<step?'bg-green-400':'bg-slate-200'}`}/>
              ))}
            </div>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext}>
                Next <ChevronRight size={14}/>
              </Button>
            ) : (
              <Button type="button" loading={saving} onClick={handleSubmit}>
                {isEdit ? 'Save Changes' : '✓ Register Animal'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
