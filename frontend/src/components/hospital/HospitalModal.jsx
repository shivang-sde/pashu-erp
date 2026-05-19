import { useState, useEffect } from 'react'
import { X, Building2 } from 'lucide-react'
import { hospitalApi } from '../../api/hospitals.js'
import { Button } from '../ui/Button.jsx'
import { Input }  from '../ui/Input.jsx'

const EMPTY = {
  name:'', code:'', address:'', phone:'', email:'',
  state:'', district_id:'', type:'GOVERNMENT', status:'ACTIVE',
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

export function HospitalModal({ open, onClose, onSaved, editData }) {
  const [form,     setForm]     = useState(EMPTY)
  const [errors,   setErrors]   = useState({})
  const [saving,   setSaving]   = useState(false)
  const [apiErr,   setApiErr]   = useState('')
  const [allDists, setAllDists] = useState([])
  const [states,   setStates]   = useState([])
  const [filtered, setFiltered] = useState([])
  const isEdit = !!editData

  useEffect(() => {
    hospitalApi.getAllDistricts()
      .then(r => {
        const list = r.data.data || []
        setAllDists(list)
        setStates([...new Set(list.map(d => d.state).filter(Boolean))].sort())
      }).catch(() => {})
  }, [])

  useEffect(() => {
    setFiltered(form.state ? allDists.filter(d => d.state === form.state) : [])
  }, [form.state, allDists])

  useEffect(() => {
    if (!open) return
    if (editData) {
      setForm({
        name:        editData.name || '',
        code:        editData.code || '',
        address:     editData.address || '',
        phone:       editData.phone || '',
        email:       editData.email || '',
        state:       editData.district?.state || '',
        district_id: editData.district?.id || editData.district_id || '',
        type:        editData.type || 'GOVERNMENT',
        status:      editData.status || 'ACTIVE',
      })
    } else { setForm(EMPTY) }
    setErrors({}); setApiErr('')
  }, [open, editData])

  function set(field) {
    return e => {
      setForm(p => ({ ...p, [field]: e?.target ? e.target.value : e }))
      setErrors(p => ({ ...p, [field]: '' }))
      setApiErr('')
    }
  }

  function handleStateChange(val) {
    setForm(p => ({ ...p, state: val, district_id: '' }))
    setErrors(p => ({ ...p, state: '', district_id: '' }))
  }

  async function handleSubmit() {
    const e = {}
    if (!form.name.trim())  e.name = 'Hospital name is required'
    if (!form.code.trim())  e.code = 'Hospital code is required'
    if (!form.state)        e.state = 'State is required'
    if (!form.district_id)  e.district_id = 'District is required'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      if (isEdit) await hospitalApi.update(editData.id, form)
      else        await hospitalApi.create(form)
      onSaved(); onClose()
    } catch (err) {
      setApiErr(err?.response?.data?.message || 'Something went wrong.')
    } finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.35)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center"><Building2 size={18} className="text-primary-600"/></div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-800">{isEdit ? 'Edit Hospital' : 'Add New Hospital'}</h2>
              <p className="text-xs text-slate-400">{isEdit ? 'Update hospital details' : 'Register a new hospital'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {apiErr && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{apiErr}</div>}

          <Input label="Hospital Name" id="h-name" placeholder="e.g. Ahmedabad Vet Hospital"
            value={form.name} onChange={set('name')} error={errors.name} required/>
          <Input label="Hospital Code" id="h-code" placeholder="e.g. PVHC-AMD-002"
            value={form.code} onChange={set('code')} error={errors.code} required/>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FLabel label="State" required error={errors.state}>
              <select value={form.state} onChange={e => handleStateChange(e.target.value)}
                className={'input-base' + (errors.state ? ' input-error' : '')}>
                <option value="">Select state…</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FLabel>
            <FLabel label="District" required error={errors.district_id}>
              <select value={form.district_id} onChange={set('district_id')}
                disabled={!form.state || !filtered.length}
                className={'input-base' + (errors.district_id ? ' input-error' : '') + (!form.state ? ' opacity-50' : '')}>
                <option value="">{form.state ? 'Select district…' : 'Select state first'}</option>
                {filtered.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </FLabel>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FLabel label="Type">
              <select value={form.type} onChange={set('type')} className="input-base">
                <option value="GOVERNMENT">Government</option>
                <option value="PRIVATE">Private</option>
              </select>
            </FLabel>
            <FLabel label="Status">
              <select value={form.status} onChange={set('status')} className="input-base">
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </FLabel>
            <Input label="Phone" id="h-phone" placeholder="079-12345678" value={form.phone} onChange={set('phone')} error={errors.phone}/>
            <Input label="Email" id="h-email" type="email" placeholder="hospital@example.com" value={form.email} onChange={set('email')} error={errors.email}/>
          </div>

          <FLabel label="Address">
            <textarea value={form.address} onChange={set('address')} rows={2} placeholder="Full address…" className="input-base resize-none"/>
          </FLabel>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="button" loading={saving} onClick={handleSubmit}>{isEdit ? 'Save Changes' : 'Add Hospital'}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
