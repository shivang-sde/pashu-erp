import { useState, useEffect, useMemo } from 'react'
import { X, PackagePlus } from 'lucide-react'
import { pharmacyApi } from '../../api/pharmacy.js'
import { Button } from '../ui/Button.jsx'
import { Input } from '../ui/Input.jsx'

const EMPTY = {
  medicine_id: '',
  hospital_id: '',
  batch_number: '',
  quantity: '',
  unit_price: '',
  expiry_date: '',
  manufacture_date: '',
  supplier: '',
  received_date: '',
  notes: ''
}

function FLabel({ label, required, children, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required && (
          <span className="text-red-500 ml-0.5">*</span>
        )}
      </label>

      {children}

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
          {error}
        </p>
      )}
    </div>
  )
}

export function StockInModal({
  open,
  onClose,
  onSaved,
  hospitals = [],
  medicines = [],
  defaultHospitalId = ''
}) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [apiErr, setApiErr] = useState('')
  const [medSearch, setMedSearch] = useState('')

  useEffect(() => {
    if (!open) return

    setForm({
      ...EMPTY,
      hospital_id: defaultHospitalId || '',
      received_date: new Date()
        .toISOString()
        .split('T')[0]
    })

    setErrors({})
    setApiErr('')
    setMedSearch('')
  }, [open, defaultHospitalId])

  const filteredMeds = useMemo(() => {
    if (!medSearch.trim()) return []

    const keyword = medSearch.toLowerCase()

    return medicines
      .filter((m) => {
        const name = m?.name?.toLowerCase() || ''
        const generic =
          m?.generic_name?.toLowerCase() || ''

        return (
          name.includes(keyword) ||
          generic.includes(keyword)
        )
      })
      .slice(0, 8)
  }, [medSearch, medicines])

  const selectedMed = useMemo(() => {
    return medicines.find(
      (m) =>
        String(m.id) ===
        String(form.medicine_id)
    )
  }, [medicines, form.medicine_id])

  function set(field) {
    return (e) => {
      const value = e?.target
        ? e.target.value
        : e

      setForm((prev) => ({
        ...prev,
        [field]: value
      }))

      setErrors((prev) => ({
        ...prev,
        [field]: ''
      }))

      setApiErr('')
    }
  }

  function validate() {
    const e = {}

    if (!form.medicine_id) {
      e.medicine_id = 'Select a medicine'
    }

    if (
      !form.hospital_id &&
      hospitals.length > 1
    ) {
      e.hospital_id = 'Select hospital'
    }

    if (!form.batch_number.trim()) {
      e.batch_number =
        'Batch number required'
    }

    if (
      !form.quantity ||
      Number(form.quantity) <= 0
    ) {
      e.quantity = 'Valid quantity required'
    }

    if (!form.expiry_date) {
      e.expiry_date =
        'Expiry date required'
    }

    if (
      form.manufacture_date &&
      form.expiry_date &&
      new Date(form.manufacture_date) >=
      new Date(form.expiry_date)
    ) {
      e.manufacture_date =
        'Manufacture date must be before expiry date'
    }

    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const validationErrors = validate()

    if (
      Object.keys(validationErrors).length > 0
    ) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)
    setApiErr('')

    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        unit_price: form.unit_price
          ? Number(form.unit_price)
          : 0
      }

      await pharmacyApi.stockIn(payload)

      if (onSaved) {
        onSaved()
      }

      if (onClose) {
        onClose()
      }
    } catch (err) {
      console.error(
        'Stock In Error:',
        err
      )

      setApiErr(
        err?.response?.data?.message ||
        err?.message ||
        'Failed to add stock'
      )
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.35)'
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <PackagePlus
                size={18}
                className="text-green-600"
              />
            </div>

            <div>
              <h2 className="font-display text-base font-bold text-slate-800">
                Stock In
              </h2>

              <p className="text-xs text-slate-400">
                Add medicines to pharmacy
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="px-6 py-5 space-y-4"
        >

          {apiErr && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {apiErr}
            </div>
          )}

          {/* Medicine Search */}
          <FLabel
            label="Medicine"
            required
            error={errors.medicine_id}
          >

            <input
              type="text"
              placeholder="Search medicine by name..."
              value={medSearch}
              onChange={(e) => {
                const value = e.target.value

                setMedSearch(value)

                if (!value) {
                  setForm((prev) => ({
                    ...prev,
                    medicine_id: ''
                  }))
                }
              }}
              className={`input-base ${errors.medicine_id
                  ? 'input-error'
                  : ''
                }`}
            />

            {filteredMeds.length > 0 &&
              !form.medicine_id && (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-36 overflow-y-auto mt-1">

                  {filteredMeds.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          medicine_id: String(
                            m.id
                          )
                        }))

                        setMedSearch(
                          `${m.name}${m.generic_name
                            ? ` (${m.generic_name})`
                            : ''
                          }`
                        )
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0"
                    >

                      <span className="font-medium text-slate-700">
                        {m.name}
                      </span>

                      {m.generic_name && (
                        <span className="text-xs text-slate-400 ml-2">
                          {m.generic_name}
                        </span>
                      )}

                      <span className="text-xs text-slate-400 ml-2">
                        · {m.category} · {m.unit}
                      </span>
                    </button>
                  ))}
                </div>
              )}

            {form.medicine_id &&
              selectedMed && (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2 mt-1">

                  <span className="text-xs text-green-700 font-medium">
                    ✓ {selectedMed.name}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        medicine_id: ''
                      }))

                      setMedSearch('')
                    }}
                    className="text-xs text-green-600 hover:text-green-800"
                  >
                    Change
                  </button>
                </div>
              )}
          </FLabel>

          {/* Hospital */}
          {hospitals.length > 1 && (
            <FLabel
              label="Hospital"
              required
              error={errors.hospital_id}
            >

              <select
                value={form.hospital_id}
                onChange={set('hospital_id')}
                className={`input-base ${errors.hospital_id
                    ? 'input-error'
                    : ''
                  }`}
              >

                <option value="">
                  Select hospital...
                </option>

                {hospitals.map((h) => (
                  <option
                    key={h.id}
                    value={h.id}
                  >
                    {h.name}
                  </option>
                ))}
              </select>
            </FLabel>
          )}

          {/* Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

            <Input
              label="Batch Number"
              id="si-batch"
              placeholder="e.g. BT2024001"
              value={form.batch_number}
              onChange={set('batch_number')}
              error={errors.batch_number}
              required
            />

            <FLabel
              label="Quantity"
              required
              error={errors.quantity}
            >

              <input
                type="number"
                min="1"
                placeholder="0"
                value={form.quantity}
                onChange={set('quantity')}
                className={`input-base ${errors.quantity
                    ? 'input-error'
                    : ''
                  }`}
              />
            </FLabel>

            <FLabel
              label="Expiry Date"
              required
              error={errors.expiry_date}
            >

              <input
                type="date"
                value={form.expiry_date}
                onChange={set('expiry_date')}
                className={`input-base ${errors.expiry_date
                    ? 'input-error'
                    : ''
                  }`}
              />
            </FLabel>

            <FLabel
              label="Manufacture Date"
              error={errors.manufacture_date}
            >

              <input
                type="date"
                value={form.manufacture_date}
                onChange={set('manufacture_date')}
                className={`input-base ${errors.manufacture_date
                    ? 'input-error'
                    : ''
                  }`}
              />
            </FLabel>

            <FLabel label="Unit Price (₹)">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.unit_price}
                onChange={set('unit_price')}
                className={`input-base ${errors.unit_price
                    ? 'input-error'
                    : ''
                  }`}
              />
            </FLabel>

            <FLabel label="Received Date">
              <input
                type="date"
                value={form.received_date}
                onChange={set('received_date')}
                className="input-base"
              />
            </FLabel>
          </div>

          <Input
            label="Supplier"
            id="si-supplier"
            placeholder="Supplier / company name"
            value={form.supplier}
            onChange={set('supplier')}
          />

          <FLabel label="Notes">
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={3}
              placeholder="Additional notes..."
              className="input-base resize-none"
            />
          </FLabel>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">

            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              loading={saving}
            >
              Add Stock
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}