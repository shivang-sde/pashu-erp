import { useState, useEffect, useRef } from 'react'
import { X, ReceiptText, Plus, Trash2, Search } from 'lucide-react'
import { billingApi } from '../../api/billing.js'
import { Button } from '../ui/Button.jsx'
import { useAuth } from '../../hooks/useAuth.jsx'

const BILL_TYPES    = ['OPD','MEDICINE','SURGERY','LABORATORY','VACCINATION','OTHER']
const PAYMENT_MODES = [
  { value:'CASH',         label:'Cash' },
  { value:'UPI',          label:'UPI' },
  { value:'CARD',         label:'Card' },
  { value:'GOVT_SUBSIDY', label:'Govt Subsidy' },
  { value:'FREE',         label:'Free Treatment' },
  { value:'INSURANCE',    label:'Insurance' },
]
const ITEM_TYPES = ['SERVICE','MEDICINE','PROCEDURE','CONSULTATION','OTHER']

const PRESET_ITEMS = {
  OPD:         [{ item_name:'OPD Consultation', item_type:'CONSULTATION', quantity:1, unit_price:100, tax_pct:0 }],
  MEDICINE:    [{ item_name:'Medicine Charges',  item_type:'MEDICINE',     quantity:1, unit_price:0,   tax_pct:5 }],
  SURGERY:     [{ item_name:'Surgery Charges',   item_type:'PROCEDURE',    quantity:1, unit_price:0,   tax_pct:5 }, { item_name:'Anaesthesia', item_type:'PROCEDURE', quantity:1, unit_price:0, tax_pct:0 }],
  VACCINATION: [{ item_name:'Vaccination',       item_type:'PROCEDURE',    quantity:1, unit_price:50,  tax_pct:0 }],
  LABORATORY:  [{ item_name:'Lab Test',          item_type:'SERVICE',      quantity:1, unit_price:0,   tax_pct:0 }],
  OTHER:       [],
}

const EMPTY_ITEM = { item_name:'', item_type:'SERVICE', quantity:1, unit_price:0, tax_pct:0, description:'' }

function FLabel({ label, required, children, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500 inline-block"/>{error}</p>}
    </div>
  )
}

export function CreateBillModal({ open, onClose, onSaved, hospitals=[] }) {
  const { getUser } = useAuth()
  const currentUser = getUser()
  const [step,        setStep]        = useState(1)
  const [form,        setForm]        = useState({ owner_id:'', animal_id:'', hospital_id:'', bill_type:'OPD', bill_date: new Date().toISOString().split('T')[0], payment_mode:'CASH', discount_pct:0, notes:'' })
  const [items,       setItems]       = useState([...PRESET_ITEMS.OPD])
  const [errors,      setErrors]      = useState({})
  const [saving,      setSaving]      = useState(false)
  const [apiErr,      setApiErr]      = useState('')
  const [ownerSearch, setOwnerSearch] = useState('')
  const [owners,      setOwners]      = useState([])
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [animals,     setAnimals]     = useState([])
  const searchTimer = useRef(null)

  useEffect(() => {
    if (!open) return
    setStep(1)
    const defaultHospId = currentUser?.role === 'HOSPITAL_ADMIN'
      ? (currentUser?.hospital_id || '')
      : (hospitals.length === 1 ? hospitals[0].id : '')
    setForm({ owner_id:'', animal_id:'', hospital_id: defaultHospId, bill_type:'OPD', bill_date: new Date().toISOString().split('T')[0], payment_mode:'CASH', discount_pct:0, notes:'' })
    setItems([...PRESET_ITEMS.OPD])
    setErrors({}); setApiErr('')
    setOwnerSearch(''); setOwners([]); setSelectedOwner(null); setAnimals([])
  }, [open, hospitals])

  // Debounced owner search
  useEffect(() => {
    clearTimeout(searchTimer.current)
    if (ownerSearch.length < 2) { setOwners([]); return }
    searchTimer.current = setTimeout(async () => {
      try { const r = await billingApi.searchOwners(ownerSearch); setOwners(r.data.data) } catch {}
    }, 300)
    return () => clearTimeout(searchTimer.current)
  }, [ownerSearch])

  async function selectOwner(owner) {
    setSelectedOwner(owner)
    setForm(p => ({ ...p, owner_id: owner.id, animal_id: '' }))
    setOwnerSearch(owner.name + ' · ' + owner.phone)
    setOwners([])
    try { const r = await billingApi.getOwnerAnimals(owner.id); setAnimals(r.data.data) } catch {}
  }

  function setBillType(type) {
    setForm(p => ({ ...p, bill_type: type }))
    setItems([...(PRESET_ITEMS[type]||[])])
  }

  function setField(field) {
    return e => {
      const val = e?.target ? e.target.value : e
      setForm(p => ({ ...p, [field]: val }))
      setErrors(p => ({ ...p, [field]:'' }))
      setApiErr('')
    }
  }

  function addItem() { setItems(p => [...p, { ...EMPTY_ITEM }]) }
  function removeItem(i) { setItems(p => p.filter((_,idx) => idx !== i)) }
  function setItem(i, field) {
    return e => {
      const val = e?.target ? e.target.value : e
      setItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
    }
  }

  // Totals
  const subtotal  = items.reduce((s,i) => s + (parseFloat(i.unit_price)||0) * (parseInt(i.quantity)||1), 0)
  const taxTotal  = items.reduce((s,i) => s + (parseFloat(i.unit_price)||0) * (parseInt(i.quantity)||1) * ((parseFloat(i.tax_pct)||0)/100), 0)
  const discount  = subtotal * ((parseFloat(form.discount_pct)||0)/100)
  const grandTotal = subtotal + taxTotal - discount

  async function handleSubmit(e) {
    if (e?.preventDefault) e.preventDefault()

    // If still on step 1, just advance — don't submit
    if (step !== 2) {
      const errs = {}
      if (!form.owner_id) errs.owner_id = 'Select an owner'
      if (!form.hospital_id && currentUser?.role !== 'HOSPITAL_ADMIN') errs.hospital_id = 'Select a hospital'
      if (Object.keys(errs).length) { setErrors(errs); return }
      setStep(2)
      return
    }

    const errs = {}
    if (!form.owner_id) errs.owner_id = 'Select an owner'
    if (!form.hospital_id && currentUser?.role !== 'HOSPITAL_ADMIN') errs.hospital_id = 'Select a hospital'
    if (!items.length)  errs.items    = 'Add at least one item'
    const validItems = items.filter(i => i.item_name && String(i.item_name).trim())
    if (!validItems.length) errs.items = 'Each item must have a name'
    if (Object.keys(errs).length) { setErrors(errs); return }

    // Normalise types before sending
    const cleanItems = validItems.map(i => ({
      item_name:   String(i.item_name).trim(),
      item_type:   i.item_type || 'SERVICE',
      quantity:    parseInt(i.quantity)   || 1,
      unit_price:  parseFloat(i.unit_price) || 0,
      tax_pct:     parseFloat(i.tax_pct)  || 0,
      description: i.description || '',
    }))

    setSaving(true)
    try {
      await billingApi.create({ ...form, items: cleanItems })
      onSaved()
      onClose()
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.response?.data?.message || err.message || 'Failed to create bill'
      setApiErr(detail)
    } finally { setSaving(false) }
  }

  if (!open) return null

  const ANIMAL_EMOJIS = { COW:'🐄', BUFFALO:'🐃', GOAT:'🐐', DOG:'🐕', CAMEL:'🐪', HORSE:'🐎', SHEEP:'🐑', OTHER:'🐾' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.35)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[94vh] flex flex-col animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><ReceiptText size={18} className="text-blue-600"/></div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-800">Create Bill</h2>
              <p className="text-xs text-slate-400">Step {step} of 2 — {step===1?'Patient & Bill Info':'Line Items & Payment'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          {[1,2].map(s => (
            <div key={s} className={`flex items-center gap-2 text-xs font-medium ${step===s?'text-primary-700':'text-slate-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step===s?'bg-primary-600 text-white':step>s?'bg-green-500 text-white':'bg-slate-200 text-slate-500'}`}>
                {step > s ? '✓' : s}
              </div>
              {s===1?'Patient Info':'Bill Items'}
              {s < 2 && <div className="w-8 h-px bg-slate-300 mx-1"/>}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">

            {apiErr && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{apiErr}</div>}

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <>
                {/* Owner search */}
                <FLabel label="Animal Owner" required error={errors.owner_id}>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input type="text" placeholder="Search by owner name or phone…"
                      value={ownerSearch}
                      onChange={e => { setOwnerSearch(e.target.value); if (!e.target.value) { setSelectedOwner(null); setForm(p=>({...p,owner_id:'',animal_id:''})); setAnimals([]) } }}
                      className={'input-base pl-10' + (errors.owner_id?' input-error':'')}/>
                  </div>
                  {owners.length > 0 && !form.owner_id && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto mt-1">
                      {owners.map(o => (
                        <button key={o.id} type="button" onClick={() => selectOwner(o)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0">
                          <span className="font-medium text-slate-700">{o.name}</span>
                          <span className="text-slate-400 ml-2">· {o.phone}</span>
                          {o.village && <span className="text-slate-400 ml-2">· {o.village}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {form.owner_id && (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2 mt-1">
                      <span className="text-xs text-green-700 font-medium">✓ {selectedOwner?.name} · {selectedOwner?.phone}</span>
                      <button type="button" onClick={() => { setSelectedOwner(null); setForm(p=>({...p,owner_id:'',animal_id:''})); setOwnerSearch(''); setAnimals([]) }}
                        className="text-xs text-green-600 hover:text-green-800">Change</button>
                    </div>
                  )}
                </FLabel>

                {/* Animal selection */}
                {animals.length > 0 && (
                  <FLabel label="Animal (optional)">
                    <select value={form.animal_id} onChange={setField('animal_id')} className="input-base">
                      <option value="">No specific animal</option>
                      {animals.map(a => (
                        <option key={a.id} value={a.id}>
                          {ANIMAL_EMOJIS[a.animal_type]||'🐾'} {a.animal_type}{a.breed?' · '+a.breed:''}{a.name?' "'+a.name+'"':''}
                        </option>
                      ))}
                    </select>
                  </FLabel>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {/* Hospital */}
                  {hospitals.length > 1 && (
                    <FLabel label="Hospital" required error={errors.hospital_id}>
                      <select value={form.hospital_id} onChange={setField('hospital_id')} className={'input-base'+(errors.hospital_id?' input-error':'')}>
                        <option value="">Select hospital…</option>
                        {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                    </FLabel>
                  )}

                  {/* Bill type */}
                  <FLabel label="Bill Type">
                    <select value={form.bill_type} onChange={e => setBillType(e.target.value)} className="input-base">
                      {BILL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FLabel>

                  {/* Date */}
                  <FLabel label="Bill Date" required>
                    <input type="date" value={form.bill_date} onChange={setField('bill_date')} className="input-base"/>
                  </FLabel>
                </div>
              </>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <>
                {/* Line items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700">Bill Items</p>
                    <button type="button" onClick={addItem}
                      className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 font-medium">
                      <Plus size={13}/> Add Item
                    </button>
                  </div>

                  {errors.items && <p className="text-xs text-red-500 mb-2">{errors.items}</p>}

                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                        <div className="grid grid-cols-12 gap-2 items-start">
                          <div className="col-span-5">
                            <input placeholder="Item name" value={item.item_name} onChange={setItem(i,'item_name')}
                              className="input-base text-xs h-8 bg-white"/>
                          </div>
                          <div className="col-span-2">
                            <input type="number" min="1" placeholder="Qty" value={item.quantity} onChange={setItem(i,'quantity')}
                              className="input-base text-xs h-8 bg-white text-center"/>
                          </div>
                          <div className="col-span-2">
                            <input type="number" min="0" step="0.01" placeholder="₹ Price" value={item.unit_price} onChange={setItem(i,'unit_price')}
                              className="input-base text-xs h-8 bg-white"/>
                          </div>
                          <div className="col-span-2">
                            <input type="number" min="0" max="28" placeholder="GST%" value={item.tax_pct} onChange={setItem(i,'tax_pct')}
                              className="input-base text-xs h-8 bg-white"/>
                          </div>
                          <div className="col-span-1 flex items-center justify-end">
                            <button type="button" onClick={() => removeItem(i)}
                              className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 size={13}/>
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <select value={item.item_type} onChange={setItem(i,'item_type')} className="input-base text-xs h-7 w-32 bg-white">
                            {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <span className="text-xs font-semibold text-slate-700">
                            ₹ {((parseFloat(item.unit_price)||0) * (parseInt(item.quantity)||1)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                  <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>₹ {subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm text-slate-600"><span>GST / Tax</span><span>₹ {taxTotal.toFixed(2)}</span></div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Discount (%)</span>
                    <input type="number" min="0" max="100" value={form.discount_pct} onChange={setField('discount_pct')}
                      className="input-base text-xs h-7 w-20 text-right"/>
                  </div>
                  {discount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount Amount</span><span>- ₹ {discount.toFixed(2)}</span></div>}
                  <div className="flex justify-between font-bold text-base text-slate-800 border-t border-slate-200 pt-2 mt-2"><span>Total</span><span>₹ {grandTotal.toFixed(2)}</span></div>
                </div>

                {/* Payment */}
                <FLabel label="Payment Mode">
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_MODES.map(m => (
                      <button key={m.value} type="button" onClick={() => setField('payment_mode')({ target:{ value:m.value } })}
                        className={'py-2 rounded-xl text-xs font-semibold border-2 transition-all ' +
                          (form.payment_mode===m.value ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </FLabel>

                <FLabel label="Notes">
                  <textarea value={form.notes} onChange={setField('notes')} rows={2} placeholder="Additional notes…" className="input-base resize-none"/>
                </FLabel>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <div>
              {step === 2 && <Button type="button" variant="secondary" size="sm" onClick={() => setStep(1)}>← Back</Button>}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              {step === 1 ? (
                <Button type="button" onClick={() => {
                  const errs = {}
                  if (!form.owner_id) errs.owner_id = 'Select an owner'
                  if (!form.hospital_id && currentUser?.role !== 'HOSPITAL_ADMIN') errs.hospital_id = 'Select a hospital'
                  if (Object.keys(errs).length) { setErrors(errs); return }
                  setStep(2)
                }}>Next →</Button>
              ) : (
                <Button type="button" loading={saving} onClick={handleSubmit}>Create Bill</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
