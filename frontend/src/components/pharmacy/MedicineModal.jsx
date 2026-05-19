import { useState, useEffect } from 'react'
import { X, Pill } from 'lucide-react'
import { pharmacyApi } from '../../api/pharmacy.js'
import { Button } from '../ui/Button.jsx'
import { Input  } from '../ui/Input.jsx'

const CATEGORIES = ['TABLET','CAPSULE','INJECTION','SYRUP','OINTMENT','POWDER','VACCINE','SURGICAL','OTHER']
const EMPTY = { name:'', generic_name:'', category:'TABLET', unit:'Strip', manufacturer:'', description:'', min_stock_level:10 }

function FLabel({ label, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  )
}

export function MedicineModal({ open, onClose, onSaved, editData }) {
  const [form,   setForm]   = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [apiErr, setApiErr] = useState('')
  const isEdit = !!editData

  useEffect(() => {
    if (!open) return
    setForm(editData ? {
      name:            editData.name            || '',
      generic_name:    editData.generic_name    || '',
      category:        editData.category        || 'TABLET',
      unit:            editData.unit            || 'Strip',
      manufacturer:    editData.manufacturer    || '',
      description:     editData.description     || '',
      min_stock_level: editData.min_stock_level ?? 10,
    } : EMPTY)
    setErrors({}); setApiErr('')
  }, [open, editData])

  function set(field) {
    return e => {
      const val = e?.target ? e.target.value : e
      setForm(p => ({ ...p, [field]: val }))
      setErrors(p => ({ ...p, [field]:'' }))
      setApiErr('')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setErrors({ name:'Name is required' }); return }
    setSaving(true)
    try {
      if (isEdit) await pharmacyApi.updateMedicine(editData.id, form)
      else        await pharmacyApi.createMedicine(form)
      onSaved(); onClose()
    } catch (err) {
      setApiErr(err?.response?.data?.message || 'Something went wrong')
    } finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.35)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><Pill size={18} className="text-blue-600"/></div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-800">{isEdit ? 'Edit Medicine' : 'Add Medicine'}</h2>
              <p className="text-xs text-slate-400">{isEdit ? 'Update medicine details' : 'Add to medicine master'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          {apiErr && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{apiErr}</div>}

          <Input label="Medicine Name" id="m-name" placeholder="e.g. Oxytocin" value={form.name} onChange={set('name')} error={errors.name} required/>
          <Input label="Generic Name" id="m-generic" placeholder="e.g. Oxytocin Injection" value={form.generic_name} onChange={set('generic_name')}/>

          <div className="grid grid-cols-2 gap-3">
            <FLabel label="Category">
              <select value={form.category} onChange={set('category')} className="input-base">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FLabel>
            <Input label="Unit" id="m-unit" placeholder="e.g. Strip, Vial, Bottle" value={form.unit} onChange={set('unit')}/>
            <Input label="Manufacturer" id="m-mfg" placeholder="Company name" value={form.manufacturer} onChange={set('manufacturer')} className="col-span-2"/>
            <FLabel label="Min Stock Level (Alert Threshold)">
              <input type="number" min="0" value={form.min_stock_level} onChange={set('min_stock_level')} className="input-base"/>
            </FLabel>
          </div>

          <FLabel label="Description">
            <textarea value={form.description} onChange={set('description')} rows={2} placeholder="Usage notes..." className="input-base resize-none"/>
          </FLabel>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>{isEdit ? 'Save Changes' : 'Add Medicine'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
