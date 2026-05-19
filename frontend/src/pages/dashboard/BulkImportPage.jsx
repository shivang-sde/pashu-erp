import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  Upload, Download, CheckCircle2, XCircle,
  AlertTriangle, FileSpreadsheet, RefreshCw,
  Stethoscope, PawPrint, Pill, Package, X,
} from 'lucide-react'
import { bulkApi } from '../../api/bulk.js'
import { Button } from '../../components/ui/Button.jsx'

const IMPORT_TYPES = [
  {
    id: 'doctors',
    label: 'Doctors',
    icon: Stethoscope,
    color: 'bg-green-50 text-green-700 border-green-200',
    desc: 'Import doctor accounts with specializations and hospital assignments',
  },
  {
    id: 'animals',
    label: 'Animal Patients',
    icon: PawPrint,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    desc: 'Import animal patients with owner details',
  },
  {
    id: 'medicines',
    label: 'Medicines',
    icon: Pill,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'Add medicines to the master medicine list',
  },
  {
    id: 'stock',
    label: 'Medicine Stock',
    icon: Package,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    desc: 'Bulk stock-in medicines across hospitals',
  },
]

// ── Download Excel template ───────────────────────────────────
async function downloadTemplate(type, template) {
  const headers = template.columns.map(c => c.label)
  const example = template.columns.map(c => c.example)

  const ws = XLSX.utils.aoa_to_sheet([headers, example])

  // Style header row bold (xlsx doesn't support rich CSS but width helps)
  ws['!cols'] = template.columns.map(() => ({ wch: 22 }))

  // Add notes sheet
  const notesData = [
    ['Notes & Instructions'],
    [''],
    ...template.columns.map(c => [c.label, c.required ? 'Required' : 'Optional', c.example]),
    [''],
    ['Field Rules:'],
    ...template.notes.map(n => ['', n]),
  ]
  const wsNotes = XLSX.utils.aoa_to_sheet(notesData)
  wsNotes['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 30 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  XLSX.utils.book_append_sheet(wb, wsNotes, 'Instructions')

  XLSX.writeFile(wb, `pashucare_${type}_template.xlsx`)
}

// ════════════════════════════════════════════════════════════
export default function BulkImportPage() {
  const [selectedType, setSelectedType] = useState(null)
  const [template,     setTemplate]     = useState(null)
  const [rows,         setRows]         = useState([])
  const [validation,   setValidation]   = useState(null)
  const [importing,    setImporting]    = useState(false)
  const [validating,   setValidating]   = useState(false)
  const [downloadingTpl, setDownloadingTpl] = useState(false)
  const [result,       setResult]       = useState(null)
  const [toast,        setToast]        = useState(null)
  const [step,         setStep]         = useState(1) // 1=select, 2=upload, 3=preview, 4=done
  const fileRef = useRef(null)

  function showToast(msg, type = 'success') {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function selectType(type) {
    setSelectedType(type)
    setRows([])
    setValidation(null)
    setResult(null)
    setStep(2)
    try {
      const r = await bulkApi.getTemplate(type.id)
      setTemplate(r.data.data)
    } catch {
      showToast('Failed to load template', 'error')
    }
  }

  async function handleDownloadTemplate() {
    if (!template) return
    setDownloadingTpl(true)
    try {
      await downloadTemplate(selectedType.id, template)
    } catch {
      showToast('Failed to generate template', 'error')
    } finally {
      setDownloadingTpl(false)
    }
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb   = XLSX.read(ev.target.result, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (!data.length) { showToast('No data rows found in the Excel file', 'error'); return }

        // Map Excel column labels to field keys using template
        if (template) {
          const labelToKey = {}
          template.columns.forEach(c => { labelToKey[c.label] = c.key })

          const mapped = data.map(row => {
            const mapped = {}
            Object.entries(row).forEach(([label, val]) => {
              const key = labelToKey[label] || label
              mapped[key] = val
            })
            return mapped
          })
          setRows(mapped)
        } else {
          setRows(data)
        }

        setValidation(null)
        setResult(null)
        setStep(3)
        showToast(`${data.length} rows loaded from Excel`)
      } catch (err) {
        showToast('Failed to parse Excel file. Make sure you used the correct template.', 'error')
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  async function handleValidate() {
    setValidating(true)
    try {
      const r = await bulkApi.validate(selectedType.id, rows)
      setValidation(r.data.data)
    } catch (err) {
      showToast(err?.response?.data?.message || 'Validation failed', 'error')
    } finally { setValidating(false) }
  }

  async function handleImport() {
    setImporting(true)
    try {
      const validRows = validation?.results?.filter(r => r.status === 'ok').map(r => r.normalized) || rows
      const r = await bulkApi.import(selectedType.id, rows)
      setResult(r.data.data)
      setStep(4)
      showToast(r.data.message)
    } catch (err) {
      showToast(err?.response?.data?.message || 'Import failed', 'error')
    } finally { setImporting(false) }
  }

  function reset() {
    setSelectedType(null); setTemplate(null)
    setRows([]); setValidation(null); setResult(null)
    setStep(1)
  }

  const validCount  = validation?.summary?.valid  || 0
  const errorCount  = validation?.summary?.errors || 0
  const canImport   = validation && validCount > 0

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {toast && (
        <div className={'fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in ' +
          (toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white')}>
          {toast.message}
          <button onClick={() => setToast(null)}><X size={14}/></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Bulk Import</h1>
          <p className="text-sm text-slate-500 mt-1">Import data from Excel spreadsheets</p>
        </div>
        {step > 1 && (
          <Button variant="secondary" onClick={reset}>← Start Over</Button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {['Select Type','Upload File','Preview & Validate','Done'].map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={'flex items-center gap-1.5 text-xs font-medium ' +
              (step > i+1 ? 'text-green-600' : step === i+1 ? 'text-primary-700' : 'text-slate-400')}>
              <div className={'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ' +
                (step > i+1 ? 'bg-green-100 text-green-700' : step === i+1 ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-400')}>
                {step > i+1 ? '✓' : i+1}
              </div>
              <span className="hidden sm:block">{s}</span>
            </div>
            {i < 3 && <div className={'h-px flex-1 min-w-8 ' + (step > i+1 ? 'bg-green-300' : 'bg-slate-200')}/>}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Select type ── */}
      {step === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {IMPORT_TYPES.map(type => (
            <button key={type.id} onClick={() => selectType(type)}
              className="bg-white rounded-2xl border-2 border-slate-200 hover:border-primary-400 p-5 text-left transition-all hover:shadow-card group">
              <div className={'w-10 h-10 rounded-xl flex items-center justify-center mb-3 ' + type.color}>
                <type.icon size={18}/>
              </div>
              <h3 className="font-display text-base font-bold text-slate-800 group-hover:text-primary-700">{type.label}</h3>
              <p className="text-xs text-slate-500 mt-1">{type.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* ── STEP 2: Upload ── */}
      {step === 2 && selectedType && template && (
        <div className="space-y-4">
          {/* Template info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={'w-9 h-9 rounded-xl flex items-center justify-center ' + selectedType.color}>
                <selectedType.icon size={16}/>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{template.name}</h3>
                <p className="text-xs text-slate-400">{template.columns.length} columns · {template.columns.filter(c=>c.required).length} required</p>
              </div>
            </div>

            {/* Columns preview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {template.columns.map(col => (
                <div key={col.key} className={'flex items-center gap-2 px-3 py-2 rounded-xl text-xs ' +
                  (col.required ? 'bg-primary-50 text-primary-700' : 'bg-slate-50 text-slate-600')}>
                  <span className={col.required ? 'text-primary-600' : 'text-slate-300'}>{col.required ? '●' : '○'}</span>
                  <span className="font-medium">{col.label}</span>
                </div>
              ))}
            </div>

            {/* Notes */}
            {template.notes?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">📋 Notes</p>
                {template.notes.map((n, i) => (
                  <p key={i} className="text-xs text-amber-700">• {n}</p>
                ))}
              </div>
            )}
          </div>

          {/* Download + Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mb-3">
                <Download size={20} className="text-green-600"/>
              </div>
              <h4 className="font-semibold text-slate-800 mb-1">Download Template</h4>
              <p className="text-xs text-slate-400 mb-4">Get the Excel template with correct headers and an example row</p>
              <Button variant="outline" loading={downloadingTpl} onClick={handleDownloadTemplate} icon={Download}>
                Download .xlsx
              </Button>
            </div>

            <div
              onClick={() => fileRef.current?.click()}
              className="bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-primary-400 p-5 flex flex-col items-center text-center cursor-pointer transition-all hover:bg-primary-50/30">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
                <Upload size={20} className="text-blue-600"/>
              </div>
              <h4 className="font-semibold text-slate-800 mb-1">Upload Filled File</h4>
              <p className="text-xs text-slate-400 mb-3">Click to browse or drag & drop your filled .xlsx file</p>
              <span className="text-xs text-primary-600 font-medium">Click to select file</span>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile}/>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Preview & Validate ── */}
      {step === 3 && rows.length > 0 && template && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-800">{rows.length} rows loaded</p>
              {validation && (
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="text-green-600 font-medium">{validCount} valid</span>
                  {errorCount > 0 && <span className="text-red-600 font-medium ml-2">{errorCount} errors</span>}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" loading={validating} icon={RefreshCw} onClick={handleValidate}>
                Validate Rows
              </Button>
              {canImport && (
                <Button loading={importing} icon={Upload} onClick={handleImport}>
                  Import {validCount} Row{validCount !== 1 ? 's' : ''}
                </Button>
              )}
            </div>
          </div>

          {/* Validation summary */}
          {validation && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-center">
                <div className="text-2xl font-display font-bold text-slate-800">{validation.summary.total}</div>
                <div className="text-xs text-slate-400 mt-0.5">Total Rows</div>
              </div>
              <div className="bg-green-50 rounded-2xl border border-green-200 p-4 text-center">
                <div className="text-2xl font-display font-bold text-green-700">{validCount}</div>
                <div className="text-xs text-green-600 mt-0.5">Ready to Import</div>
              </div>
              <div className={'rounded-2xl border p-4 text-center ' + (errorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200')}>
                <div className={'text-2xl font-display font-bold ' + (errorCount > 0 ? 'text-red-700' : 'text-slate-400')}>{errorCount}</div>
                <div className={'text-xs mt-0.5 ' + (errorCount > 0 ? 'text-red-600' : 'text-slate-400')}>Errors</div>
              </div>
            </div>
          )}

          {/* Data table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap w-12">#</th>
                    {validation ? (
                      <th className="text-left px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap">Status</th>
                    ) : null}
                    {template.columns.map(col => (
                      <th key={col.key} className="text-left px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap">
                        {col.label}{col.required && <span className="text-red-500 ml-0.5">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const vResult = validation?.results?.[i]
                    const isErr = vResult?.status === 'error'
                    return (
                      <tr key={i} className={'border-b border-slate-50 last:border-0 ' + (isErr ? 'bg-red-50/50' : i%2===0?'':'bg-slate-50/30')}>
                        <td className="px-3 py-2 text-slate-400">{i+1}</td>
                        {validation && (
                          <td className="px-3 py-2">
                            {isErr ? (
                              <div>
                                <XCircle size={14} className="text-red-500 inline mr-1"/>
                                <span className="text-red-600">{vResult.errors?.[0]}</span>
                                {vResult.errors?.length > 1 && (
                                  <span className="text-red-400 ml-1">+{vResult.errors.length-1} more</span>
                                )}
                              </div>
                            ) : (
                              <CheckCircle2 size={14} className="text-green-500"/>
                            )}
                          </td>
                        )}
                        {template.columns.map(col => (
                          <td key={col.key} className={'px-3 py-2 ' + (col.required && !row[col.key] ? 'text-red-400' : 'text-slate-700')}>
                            {String(row[col.key] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Done ── */}
      {step === 4 && result && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} className="text-green-600"/>
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-slate-800">Import Complete!</h3>
            <p className="text-slate-500 text-sm mt-1">
              <span className="text-green-600 font-bold">{result.imported}</span> rows imported successfully
              {result.failed > 0 && <span className="text-red-600 ml-2 font-bold">{result.failed} failed</span>}
            </p>
          </div>

          {result.errors?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left">
              <p className="text-xs font-semibold text-red-700 mb-2">Failed rows:</p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600">Row {e.row}: {e.error}</p>
              ))}
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={reset}>Import More</Button>
            <Button onClick={() => { reset(); window.location.href='/dashboard/state' }}>Go to Dashboard</Button>
          </div>
        </div>
      )}
    </div>
  )
}
