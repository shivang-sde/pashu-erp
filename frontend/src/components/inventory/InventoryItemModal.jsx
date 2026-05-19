import { useState, useEffect } from 'react'
import { X, Package } from 'lucide-react'
import { inventoryApi } from '../../api/inventory.js'
import { Button } from '../ui/Button.jsx'
import { Input  } from '../ui/Input.jsx'

const CATEGORIES = ['SURGICAL','EQUIPMENT','CONSUMABLE','VACCINE','DISINFECTANT','PPE','OTHER']
const EMPTY = { name:'', code:'', category:'SURGICAL', unit:'Piece', manufacturer:'', description:'', min_stock_level:5 }

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

export function InventoryItemModal({ open, onClose, onSaved, editData }) {
  const [form,   setForm]   = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [apiErr, setApiErr] = useState('')
  const isEdit = !!editData

  useEffect(() => {
    if (!open) return
    setForm(editData ? {
      name:            editData.name            || '',
      code:            editData.code            || '',
      category:        editData.category        || 'SURGICAL',
      unit:            editData.unit            || 'Piece',
      manufacturer:    editData.manufacturer    || '',
      description:     editData.description     || '',
      min_stock_level: editData.min_stock_level ?? 5,
    } : EMPTY)
    setErrors({})
    setApiErr('')
  }, [open, editData])

  function set(field) {
    return e => {
      const val = e?.target ? e.target.value : e
      setForm(p => ({ ...p, [field]: val }))
      setErrors(p => ({ ...p, [field]: '' }))
      setApiErr('')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim())     errs.name     = 'Name is required'
    if (!form.category)        errs.category = 'Category is required'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    try {
      if (isEdit) await inventoryApi.updateItem(editData.id, form)
      else        await inventoryApi.createItem(form)
      onSaved()
      onClose()
    } catch (err) {
      setApiErr(err?.response?.data?.message || 'Something went wrong')
    } finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background:'rgba(0,0,0,0.35)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-up">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <Package size={18} className="text-purple-600"/>
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-800">
                {isEdit ? 'Edit Item' : 'Add Inventory Item'}
              </h2>
              <p className="text-xs text-slate-400">{isEdit ? 'Update item details' : 'Add to inventory master'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          {apiErr && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{apiErr}</div>}

          <Input label="Item Name" id="inv-name" placeholder="e.g. Surgical Gloves" value={form.name} onChange={set('name')} error={errors.name} required/>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Item Code" id="inv-code" placeholder="e.g. SG-001" value={form.code} onChange={set('code')}/>

            <FLabel label="Category" required>
              <select value={form.category} onChange={set('category')}
                className={'input-base' + (errors.category ? ' input-error' : '')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
            </FLabel>

            <Input label="Unit" id="inv-unit" placeholder="e.g. Piece, Box, Pair" value={form.unit} onChange={set('unit')}/>

            <FLabel label="Min Stock Level">
              <input type="number" min="0" value={form.min_stock_level} onChange={set('min_stock_level')} className="input-base"/>
            </FLabel>
          </div>

          <Input label="Manufacturer" id="inv-mfg" placeholder="Manufacturer name" value={form.manufacturer} onChange={set('manufacturer')}/>

          <FLabel label="Description">
            <textarea value={form.description} onChange={set('description')} rows={2}
              placeholder="Usage notes..." className="input-base resize-none"/>
          </FLabel>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>{isEdit ? 'Save Changes' : 'Add Item'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
