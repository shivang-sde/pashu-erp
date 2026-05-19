import { useState, useEffect } from 'react'
import { X, PackagePlus, PackageMinus } from 'lucide-react'
import { inventoryApi } from '../../api/inventory.js'
import { Button } from '../ui/Button.jsx'

const EMPTY_IN  = { item_id:'', hospital_id:'', quantity:'', batch_number:'', expiry_date:'', unit_cost:'', supplier:'', notes:'' }
const EMPTY_OUT = { item_id:'', hospital_id:'', quantity:'', notes:'' }

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

export function StockInOutModal({ open, onClose, onSaved, mode='in', hospitals=[], items=[], defaultHospitalId='' }) {
  const [form,        setForm]        = useState({})
  const [errors,      setErrors]      = useState({})
  const [saving,      setSaving]      = useState(false)
  const [apiErr,      setApiErr]      = useState('')
  const [itemSearch,  setItemSearch]  = useState('')
  const [filteredItems, setFiltered]  = useState([])

  const isIn = mode === 'in'

  useEffect(() => {
    if (!open) return
    const base = isIn ? EMPTY_IN : EMPTY_OUT
    setForm({ ...base, hospital_id: defaultHospitalId })
    setErrors({})
    setApiErr('')
    setItemSearch('')
    setFiltered([])
  }, [open, mode, defaultHospitalId])

  useEffect(() => {
    if (itemSearch.length < 1) { setFiltered([]); return }
    const q = itemSearch.toLowerCase()
    setFiltered(items.filter(i => i.name.toLowerCase().includes(q) || (i.code||'').toLowerCase().includes(q)).slice(0,8))
  }, [itemSearch, items])

  function set(field) {
    return e => {
      const val = e?.target ? e.target.value : e
      setForm(p => ({ ...p, [field]: val }))
      setErrors(p => ({ ...p, [field]: '' }))
      setApiErr('')
    }
  }

  function selectItem(item) {
    setForm(p => ({ ...p, item_id: item.id }))
    setItemSearch(item.name + (item.code ? ' (' + item.code + ')' : ''))
    setFiltered([])
  }

  function clearItem() {
    setForm(p => ({ ...p, item_id: '' }))
    setItemSearch('')
    setFiltered([])
  }

  function validate() {
    const e = {}
    if (!form.item_id)                               e.item_id  = 'Select an item'
    if (!form.quantity || parseInt(form.quantity)<=0) e.quantity = 'Valid quantity required'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      if (isIn) await inventoryApi.stockIn(form)
      else      await inventoryApi.stockOut(form)
      onSaved()
      onClose()
    } catch (err) {
      setApiErr(err?.response?.data?.message || 'Failed to update stock')
    } finally { setSaving(false) }
  }

  const selectedItem = items.find(i => i.id === form.item_id)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background:'rgba(0,0,0,0.35)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-up">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className={'w-9 h-9 rounded-xl flex items-center justify-center ' + (isIn ? 'bg-green-50' : 'bg-red-50')}>
              {isIn ? <PackagePlus size={18} className="text-green-600"/> : <PackageMinus size={18} className="text-red-600"/>}
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-800">{isIn ? 'Stock In' : 'Stock Out'}</h2>
              <p className="text-xs text-slate-400">{isIn ? 'Add items to inventory' : 'Remove items from inventory'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
          {apiErr && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{apiErr}</div>}

          {/* Item search */}
          <FLabel label="Item" required error={errors.item_id}>
            <input type="text" placeholder="Search item by name or code…"
              value={itemSearch}
              onChange={e => { setItemSearch(e.target.value); if (!e.target.value) clearItem() }}
              className={'input-base' + (errors.item_id ? ' input-error' : '')}/>

            {filteredItems.length > 0 && !form.item_id && (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-36 overflow-y-auto mt-1">
                {filteredItems.map(i => (
                  <button key={i.id} type="button" onClick={() => selectItem(i)}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0">
                    <span className="font-medium text-slate-700">{i.name}</span>
                    {i.code && <span className="text-xs text-slate-400 ml-2">({i.code})</span>}
                    <span className="text-xs text-slate-400 ml-2">· {i.category} · {i.unit}</span>
                  </button>
                ))}
              </div>
            )}

            {form.item_id && (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2 mt-1">
                <span className="text-xs text-green-700 font-medium">✓ {selectedItem?.name}</span>
                <button type="button" onClick={clearItem} className="text-xs text-green-600 hover:text-green-800">Change</button>
              </div>
            )}
          </FLabel>

          {/* Hospital */}
          {hospitals.length > 1 && (
            <FLabel label="Hospital" required>
              <select value={form.hospital_id} onChange={set('hospital_id')} className="input-base">
                <option value="">Select hospital…</option>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </FLabel>
          )}

          <FLabel label="Quantity" required error={errors.quantity}>
            <input type="number" min="1" placeholder="0" value={form.quantity} onChange={set('quantity')}
              className={'input-base' + (errors.quantity ? ' input-error' : '')}/>
          </FLabel>

          {isIn && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FLabel label="Batch Number">
                  <input type="text" placeholder="e.g. BT2024001" value={form.batch_number} onChange={set('batch_number')} className="input-base"/>
                </FLabel>
                <FLabel label="Expiry Date">
                  <input type="date" value={form.expiry_date} onChange={set('expiry_date')} className="input-base"/>
                </FLabel>
                <FLabel label="Unit Cost (₹)">
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={form.unit_cost} onChange={set('unit_cost')} className="input-base"/>
                </FLabel>
              </div>
              <FLabel label="Supplier">
                <input type="text" placeholder="Supplier name" value={form.supplier} onChange={set('supplier')} className="input-base"/>
              </FLabel>
            </>
          )}

          <FLabel label="Notes">
            <textarea value={form.notes} onChange={set('notes')} rows={2}
              placeholder="Additional notes…" className="input-base resize-none"/>
          </FLabel>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}
              variant={isIn ? 'primary' : 'danger'}>
              {isIn ? 'Add Stock' : 'Remove Stock'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
