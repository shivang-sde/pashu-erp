import { useState, useEffect } from 'react'
import { X, Stethoscope, Eye, EyeOff } from 'lucide-react'
import { doctorApi }  from '../../api/doctors.js'
import { hospitalApi } from '../../api/hospitals.js'
import { Button } from '../ui/Button.jsx'
import { Input  } from '../ui/Input.jsx'

const SPECIALIZATIONS = [
  'Large Animals','Small Animals','Equine','Poultry',
  'Bovine','Surgery','Pathology','Radiology',
  'Dermatology','Ophthalmology','Nutrition','General Practice',
]

const EMPTY = {
  name:'', email:'', password:'', specializations:[],
  hospital_id:'', state:'', district_id:'', status:'ACTIVE',
  registration_number:'',
}

function FLabel({ label, required, children, error }) {
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

export function DoctorModal({ open, onClose, onSaved, editData }) {
  const [form,     setForm]     = useState(EMPTY)
  const [errors,   setErrors]   = useState({})
  const [saving,   setSaving]   = useState(false)
  const [apiErr,   setApiErr]   = useState('')
  const [hospitals,setHospitals]= useState([])
  const [showPw,   setShowPw]   = useState(false)
  const [allDists, setAllDists] = useState([])
  const [states,   setStates]   = useState([])
  const [filtered, setFiltered] = useState([])
  const isEdit = !!editData

  // Load hospitals + districts
  useEffect(() => {
    // Initial load — all hospitals
    hospitalApi.list({ limit: 500, status: 'ACTIVE' }).then(r => setHospitals(r.data.data.hospitals || [])).catch(() => {})
    hospitalApi.getAllDistricts().then(r => {
      const list = r.data.data || []
      setAllDists(list)
      setStates([...new Set(list.map(d => d.state).filter(Boolean))].sort())
    }).catch(() => {})
  }, [])

  // Filter districts when state changes
  useEffect(() => {
    setFiltered(form.state ? allDists.filter(d => d.state === form.state) : [])
  }, [form.state, allDists])

  // Reload hospitals when district changes
  useEffect(() => {
    if (form.district_id) {
      hospitalApi.list({ limit:500, status:'ACTIVE', district_id: form.district_id })
        .then(r => setHospitals(r.data.data.hospitals || []))
        .catch(() => {})
    } else {
      // No district selected — show all hospitals
      hospitalApi.list({ limit:500, status:'ACTIVE' })
        .then(r => setHospitals(r.data.data.hospitals || []))
        .catch(() => {})
    }
  }, [form.district_id])

  useEffect(() => {
    if (!open) return
    if (editData) {
      setForm({
        name:                editData.name                || '',
        email:               editData.email               || '',
        password:            '',
        specializations:     Array.isArray(editData.specializations) ? editData.specializations : (editData.specialization ? [editData.specialization] : []),
        registration_number: editData.registration_number || '',
        hospital_id:         editData.hospital?.id        || editData.hospital_id || '',
        state:               editData.district?.state     || '',
        district_id:         editData.district?.id        || editData.district_id || '',
        status:              editData.status              || 'ACTIVE',
      })
    } else { setForm(EMPTY) }
    setErrors({}); setApiErr(''); setShowPw(false)
  }, [open, editData])

  function set(field) {
    return e => {
      setForm(p => ({ ...p, [field]: e?.target ? e.target.value : e }))
      setErrors(p => ({ ...p, [field]: '' }))
      setApiErr('')
    }
  }

  function handleStateChange(val) {
    setForm(p => ({ ...p, state: val, district_id: '', hospital_id: '' }))
    setErrors(p => ({ ...p, district_id: '' }))
  }

  function handleDistrictChange(val) {
    setForm(p => ({ ...p, district_id: val, hospital_id: '' }))
    setErrors(p => ({ ...p, district_id: '', hospital_id: '' }))
  }

  async function handleSubmit() {
    const e = {}
    if (!form.name.trim())  e.name  = 'Doctor name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (!isEdit && !form.password)             e.password    = 'Password is required'
    if (!isEdit && form.password?.length < 6)  e.password    = 'Minimum 6 characters'
    if (!form.hospital_id)                     e.hospital_id = 'Please assign a hospital'
    if (Object.keys(e).length) { setErrors(e); return }

    setSaving(true)
    try {
      const payload = { ...form }
      if (isEdit && !payload.password) delete payload.password

      // Send specializations array (backend expects this)
      if (!Array.isArray(payload.specializations)) {
        payload.specializations = payload.specialization ? [payload.specialization] : []
      }

      // Backend expects hospital_ids array + primary_hospital_id
      if (!isEdit && payload.hospital_id) {
        payload.hospital_ids         = [payload.hospital_id]
        payload.primary_hospital_id  = payload.hospital_id
      }

      if (isEdit) await doctorApi.update(editData.id, payload)
      else        await doctorApi.create(payload)
      onSaved()
      onClose()
    } catch (err) {
      setApiErr(err?.response?.data?.message || 'Something went wrong. Try again.')
    } finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.35)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <Stethoscope size={18} className="text-green-600"/>
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-800">
                {isEdit ? 'Edit Doctor' : 'Add New Doctor'}
              </h2>
              <p className="text-xs text-slate-400">{isEdit ? 'Update doctor details' : 'Register a new doctor'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {apiErr && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{apiErr}</div>
          )}

          <Input label="Full Name" id="d-name" placeholder="Dr. Anil Mehta"
            value={form.name} onChange={set('name')} error={errors.name} required/>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email" id="d-email" type="email" placeholder="doctor@hospital.in"
              value={form.email} onChange={set('email')} error={errors.email} required/>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                {isEdit ? 'New Password' : 'Password'}{!isEdit && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'}
                  placeholder={isEdit ? 'Leave blank to keep' : 'Min. 6 characters'}
                  value={form.password} onChange={set('password')}
                  className={'input-base pr-11' + (errors.password ? ' input-error' : '')}/>
                <button type="button" tabIndex={-1} onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            <FLabel label="Specializations">
              <div className="border border-slate-200 rounded-xl p-2 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {SPECIALIZATIONS.map(s => {
                    const active = form.specializations.includes(s)
                    return (
                      <button key={s} type="button"
                        onClick={() => setForm(p => ({
                          ...p,
                          specializations: active
                            ? p.specializations.filter(x => x !== s)
                            : [...p.specializations, s]
                        }))}
                        className={'text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ' +
                          (active
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-green-400 hover:text-green-700')}>
                        {s}
                      </button>
                    )
                  })}
                </div>
                {form.specializations.length === 0 && (
                  <p className="text-xs text-slate-400 px-1">Click to select specializations</p>
                )}
              </div>
            </FLabel>

            <Input label="Registration No." id="d-reg" placeholder="VET-2024-001"
              value={form.registration_number} onChange={set('registration_number')}/>
          </div>

          {/* State → District cascade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FLabel label="State">
              <select value={form.state} onChange={e => handleStateChange(e.target.value)} className="input-base">
                <option value="">Select state…</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FLabel>
            <FLabel label="District" error={errors.district_id}>
              <select value={form.district_id} onChange={e => handleDistrictChange(e.target.value)}
                disabled={!form.state || !filtered.length}
                className={'input-base' + (errors.district_id ? ' input-error' : '') + (!form.state ? ' opacity-50' : '')}>
                <option value="">{form.state ? 'Select district…' : 'Select state first'}</option>
                {filtered.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </FLabel>
          </div>

          {/* Hospital + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FLabel label={form.district_id ? 'Hospital (filtered by district)' : 'Assigned Hospital'} required error={errors.hospital_id}>
              <select value={form.hospital_id} onChange={set('hospital_id')}
                className={'input-base' + (errors.hospital_id ? ' input-error' : '')}>
                <option value="">Select hospital…</option>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </FLabel>
            <FLabel label="Status">
              <select value={form.status} onChange={set('status')} className="input-base">
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </FLabel>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="button" loading={saving} onClick={handleSubmit}>
              {isEdit ? 'Save Changes' : 'Add Doctor'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
