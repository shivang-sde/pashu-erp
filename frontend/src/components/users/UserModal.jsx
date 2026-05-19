import { useState, useEffect } from 'react'
import { X, UserCog, Eye, EyeOff } from 'lucide-react'
import { userApi } from '../../api/users.js'
import { hospitalApi } from '../../api/hospitals.js'
import { Button } from '../ui/Button.jsx'
import { Input  } from '../ui/Input.jsx'

const ROLE_ICONS = {
  DISTRICT_ADMIN:'🏛️', HOSPITAL_ADMIN:'🏥',
  DOCTOR:'👨‍⚕️', PHARMACIST:'💊', RECEPTIONIST:'📋',
}
const EMPTY = { name:'', email:'', password:'', role:'', hospital_id:'', state:'', district_id:'', status:'ACTIVE' }

function FLabel({ label, required, children, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500 inline-block"/>{error}</p>}
    </div>
  )
}

export function UserModal({ open, onClose, onSaved, editData }) {
  const [form,     setForm]     = useState(EMPTY)
  const [errors,   setErrors]   = useState({})
  const [saving,   setSaving]   = useState(false)
  const [apiErr,   setApiErr]   = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [formData, setFormData] = useState({ hospitals:[], creatableRoles:[] })
  const [allDists, setAllDists] = useState([])
  const [states,   setStates]   = useState([])
  const [filteredDists, setFilteredDists] = useState([])
  const isEdit = !!editData

  useEffect(() => {
    userApi.getFormData().then(r => setFormData(r.data.data)).catch(() => {})
    hospitalApi.getAllDistricts().then(r => {
      const list = r.data.data || []
      setAllDists(list)
      setStates([...new Set(list.map(d => d.state).filter(Boolean))].sort())
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setFilteredDists(form.state ? allDists.filter(d => d.state === form.state) : [])
  }, [form.state, allDists])

  useEffect(() => {
    if (!open) return
    if (editData) {
      setForm({
        name:        editData.name || '',
        email:       editData.email || '',
        password:    '',
        role:        editData.role || '',
        hospital_id: editData.hospital?.id || editData.hospital_id || '',
        state:       editData.district?.state || '',
        district_id: editData.district?.id || editData.district_id || '',
        status:      editData.status || 'ACTIVE',
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
    setForm(p => ({ ...p, state: val, district_id: '' }))
    setErrors(p => ({ ...p, state: '', district_id: '' }))
  }

  const needsHospital = ['HOSPITAL_ADMIN','DOCTOR','PHARMACIST','RECEPTIONIST'].includes(form.role)
  const needsDistrict = form.role === 'DISTRICT_ADMIN'

  async function handleSubmit() {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (!isEdit && !form.password) e.password = 'Password is required'
    if (!isEdit && form.password && form.password.length < 6) e.password = 'Min 6 characters'
    if (!form.role) e.role = 'Select a role'
    if (needsHospital && !form.hospital_id) e.hospital_id = 'Hospital required for this role'
    if (needsDistrict && !form.district_id) e.district_id = 'District required'
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const payload = { ...form }
      if (isEdit && !payload.password) delete payload.password
      if (isEdit) await userApi.update(editData.id, payload)
      else        await userApi.create(payload)
      onSaved(); onClose()
    } catch (err) {
      setApiErr(err?.response?.data?.message || 'Something went wrong')
    } finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.35)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto animate-fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center"><UserCog size={18} className="text-indigo-600"/></div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-800">{isEdit ? 'Edit User' : 'Create User'}</h2>
              <p className="text-xs text-slate-400">{isEdit ? 'Update user details' : 'Add a new system user'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {apiErr && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{apiErr}</div>}

          <Input label="Full Name" id="u-name" placeholder="e.g. Ravi Patel" value={form.name} onChange={set('name')} error={errors.name} required/>
          <Input label="Email Address" id="u-email" type="email" placeholder="user@domain.com" value={form.email} onChange={set('email')} error={errors.email} required/>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">{isEdit ? 'New Password' : 'Password'}{!isEdit && <span className="text-red-500 ml-0.5">*</span>}</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} placeholder={isEdit ? 'Leave blank to keep current' : 'Min. 6 characters'}
                value={form.password} onChange={set('password')}
                className={'input-base pr-11' + (errors.password ? ' input-error' : '')}/>
              <button type="button" tabIndex={-1} onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
          </div>

          {!isEdit && (
            <FLabel label="Role" required error={errors.role}>
              <div className="grid grid-cols-2 gap-2">
                {formData.creatableRoles.map(r => (
                  <button key={r.value} type="button"
                    onClick={() => setForm(p => ({ ...p, role:r.value, hospital_id:'', state:'', district_id:'' }))}
                    className={'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left ' +
                      (form.role === r.value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
                    <span className="text-base">{ROLE_ICONS[r.value]||'👤'}</span>{r.label}
                  </button>
                ))}
              </div>
              {errors.role && <p className="text-xs text-red-500">{errors.role}</p>}
            </FLabel>
          )}

          {needsHospital && (
            <FLabel label="Assigned Hospital" required error={errors.hospital_id}>
              <select value={form.hospital_id} onChange={set('hospital_id')}
                className={'input-base' + (errors.hospital_id ? ' input-error' : '')}>
                <option value="">Select hospital…</option>
                {formData.hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </FLabel>
          )}

          {needsDistrict && (
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
                  disabled={!form.state || !filteredDists.length}
                  className={'input-base' + (errors.district_id ? ' input-error' : '') + (!form.state ? ' opacity-50' : '')}>
                  <option value="">{form.state ? 'Select district…' : 'Select state first'}</option>
                  {filteredDists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </FLabel>
            </div>
          )}

          <FLabel label="Status">
            <select value={form.status} onChange={set('status')} className="input-base">
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </FLabel>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="button" loading={saving} onClick={handleSubmit}>{isEdit ? 'Save Changes' : 'Create User'}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
