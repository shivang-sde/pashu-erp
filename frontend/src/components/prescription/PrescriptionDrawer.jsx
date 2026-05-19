import { X, Printer, Mail, Pencil, RefreshCw } from 'lucide-react'

const ANIMAL_EMOJIS = { COW:'🐄',BUFFALO:'🐃',GOAT:'🐐',DOG:'🐕',CAMEL:'🐪',HORSE:'🐎',SHEEP:'🐑',OTHER:'🐾' }
function fmt(d) { return d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : '—' }

function printPrescription(rx) {
  const emoji = ANIMAL_EMOJIS[rx.animal?.animal_type] || '🐾'
  const items = rx.items || []
  const html = `<!DOCTYPE html><html><head><title>Prescription — ${rx.doctor?.name}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;padding:20px}
    .header{border-bottom:3px solid #0f766e;padding-bottom:12px;margin-bottom:16px}
    .hosp{font-size:18px;font-weight:bold;color:#0f766e}
    .sub{font-size:10px;color:#64748b;margin-top:2px}
    .rx-symbol{font-size:32px;color:#0f766e;font-weight:bold;font-style:italic}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
    .info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px}
    .info-label{color:#64748b;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em}
    .info-value{font-size:12px;font-weight:600;color:#1e293b;margin-top:2px}
    table{width:100%;border-collapse:collapse;margin:12px 0}
    th{background:#0f766e;color:white;padding:7px 8px;text-align:left;font-size:10px}
    td{padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:10.5px}
    tr:nth-child(even) td{background:#f8fafc}
    .section-title{font-size:11px;font-weight:bold;color:#0f766e;border-bottom:1px solid #ccfbf1;padding-bottom:4px;margin:14px 0 8px;text-transform:uppercase;letter-spacing:.05em}
    .follow-up{background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:8px;margin-top:12px;font-size:11px}
    .sign-box{margin-top:28px;text-align:right;border-top:1px dashed #e2e8f0;padding-top:12px}
    .footer{text-align:center;margin-top:20px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}
    @media print{@page{margin:.8cm}}
  </style></head><body>

  <div class="header" style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <div class="hosp">${rx.hospital?.name}</div>
      <div class="sub">${rx.hospital?.address||''} ${rx.hospital?.phone?'· Tel: '+rx.hospital.phone:''}</div>
      <div class="sub" style="margin-top:4px">Dr. <strong>${rx.doctor?.name}</strong>${rx.doctor?.specialization?' · '+rx.doctor.specialization:''}</div>
    </div>
    <div style="text-align:right">
      <div class="rx-symbol">Rx</div>
      <div class="sub">Date: ${fmt(rx.createdAt||rx.created_at)}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Patient (Animal)</div>
      <div class="info-value">${emoji} ${rx.animal?.animal_type}${rx.animal?.breed?' · '+rx.animal.breed:''}${rx.animal?.name?' "'+rx.animal.name+'"':''}</div>
      <div style="font-size:10px;color:#64748b;margin-top:2px">Gender: ${rx.animal?.gender||'—'} · Age: ${rx.animal?.age_years?rx.animal.age_years+'yrs ':''  }${rx.animal?.age_months?rx.animal.age_months+'mo':''||'—'}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Owner</div>
      <div class="info-value">${rx.owner?.name}</div>
      <div style="font-size:10px;color:#64748b;margin-top:2px">Ph: ${rx.owner?.phone||'—'}</div>
    </div>
  </div>

  ${rx.chief_complaint||rx.diagnosis ? `
  <div class="info-box" style="margin-bottom:12px">
    ${rx.chief_complaint?`<div><span class="info-label">Chief Complaint: </span>${rx.chief_complaint}</div>`:''}
    ${rx.diagnosis?`<div style="margin-top:4px"><span class="info-label">Diagnosis: </span><strong>${rx.diagnosis}</strong></div>`:''}
  </div>` : ''}

  <div class="section-title">💊 Medicines Prescribed</div>
  <table>
    <thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Route</th><th>Instructions</th></tr></thead>
    <tbody>
      ${items.map((item,i) => `<tr>
        <td>${i+1}</td>
        <td><strong>${item.medicine_name}</strong></td>
        <td>${item.dosage||'—'}</td>
        <td>${item.frequency||'—'}</td>
        <td>${item.duration||'—'}</td>
        <td>${item.route||'—'}</td>
        <td style="font-size:9.5px;color:#475569">${item.instructions||'—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  ${rx.notes ? `<div class="info-box" style="margin-top:8px"><span class="info-label">Doctor's Notes: </span>${rx.notes}</div>` : ''}

  ${rx.follow_up_date ? `<div class="follow-up">⚠️ <strong>Follow-up Date:</strong> ${fmt(rx.follow_up_date)} — Please bring the animal for re-examination on this date.</div>` : ''}

  <div class="sign-box">
    <div style="font-weight:bold">Dr. ${rx.doctor?.name}</div>
    <div style="font-size:10px;color:#64748b">${rx.doctor?.specialization||''}</div>
    <div style="font-size:10px;color:#64748b">${rx.hospital?.name}</div>
  </div>

  <div class="footer">PashuCare ERP · Veterinary Prescription · ${fmt(rx.createdAt||rx.created_at)}</div>
  </body></html>`

  const w = window.open('','_blank','width=900,height=700')
  w.document.write(html)
  w.document.close()
  w.onload = () => setTimeout(() => w.print(), 300)
}

export default function PrescriptionDrawer({ prescription, open, onClose, onEdit, onSendEmail, emailing }) {
  if (!open || !prescription) return null
  const rx = prescription
  const emoji = ANIMAL_EMOJIS[rx.animal?.animal_type] || '🐾'

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose}/>
      <div className="relative w-full max-w-xl bg-white h-full flex flex-col shadow-2xl animate-slide-in">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-base font-bold text-slate-800">Prescription</h2>
            <p className="text-xs text-slate-400">Dr. {rx.doctor?.name} · {fmt(rx.createdAt||rx.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => printPrescription(rx)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200 transition-colors">
              <Printer size={13}/> Print
            </button>
            <button onClick={() => onEdit(rx)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-medium border border-primary-200 transition-colors">
              <Pencil size={13}/> Edit
            </button>
            <button onClick={() => onSendEmail(rx)} disabled={emailing===rx.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200 transition-colors disabled:opacity-50">
              {emailing===rx.id ? <RefreshCw size={13} className="animate-spin"/> : <Mail size={13}/>}
              {rx.email_sent ? 'Resend' : 'Send Email'}
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Animal + Owner */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
              <p className="text-xs text-teal-500 font-medium mb-1">Animal</p>
              <p className="text-2xl mb-1">{emoji}</p>
              <p className="font-bold text-sm text-teal-900">{rx.animal?.animal_type}{rx.animal?.breed?' · '+rx.animal.breed:''}</p>
              {rx.animal?.name && <p className="text-xs text-teal-700">"{rx.animal.name}"</p>}
              <p className="text-xs text-teal-600 mt-1">{rx.animal?.gender} · {rx.animal?.age_years?rx.animal.age_years+'y ':''}{rx.animal?.age_months?rx.animal.age_months+'m':''}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-xs text-slate-400 font-medium mb-1">Owner</p>
              <p className="font-bold text-sm text-slate-800">{rx.owner?.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{rx.owner?.phone}</p>
              {rx.owner?.email && <p className="text-xs text-slate-500">{rx.owner.email}</p>}
              <p className="text-xs text-slate-400 mt-1">{rx.hospital?.name}</p>
            </div>
          </div>

          {/* Complaint + Diagnosis */}
          {(rx.chief_complaint || rx.diagnosis) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              {rx.chief_complaint && (
                <div>
                  <p className="text-xs text-amber-500 font-semibold uppercase tracking-wide">Chief Complaint</p>
                  <p className="text-sm text-amber-900 mt-0.5">{rx.chief_complaint}</p>
                </div>
              )}
              {rx.diagnosis && (
                <div>
                  <p className="text-xs text-amber-500 font-semibold uppercase tracking-wide">Diagnosis</p>
                  <p className="text-sm font-semibold text-amber-900 mt-0.5">{rx.diagnosis}</p>
                </div>
              )}
            </div>
          )}

          {/* Medicines */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">💊 Medicines ({rx.items?.length || 0})</p>
            <div className="space-y-2">
              {rx.items?.map((item, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="flex items-start justify-between">
                    <p className="font-bold text-sm text-slate-800">{item.medicine_name}</p>
                    <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200 flex-shrink-0 ml-2">{item.route||'—'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                    <div><span className="text-slate-400">Dosage: </span><span className="font-medium">{item.dosage||'—'}</span></div>
                    <div><span className="text-slate-400">Frequency: </span><span className="font-medium">{item.frequency||'—'}</span></div>
                    <div><span className="text-slate-400">Duration: </span><span className="font-medium">{item.duration||'—'}</span></div>
                  </div>
                  {item.instructions && (
                    <p className="text-xs text-slate-500 mt-1.5 italic">{item.instructions}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {rx.notes && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-1">Doctor's Notes</p>
              <p className="text-sm text-blue-900">{rx.notes}</p>
            </div>
          )}

          {/* Follow-up */}
          {rx.follow_up_date && (
            <div className={`rounded-xl p-4 border ${new Date(rx.follow_up_date)<new Date()?'bg-red-50 border-red-200':'bg-green-50 border-green-200'}`}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1 ${new Date(rx.follow_up_date)<new Date()?'text-red-500':'text-green-500'}">
                {new Date(rx.follow_up_date)<new Date()?'⚠️ Overdue Follow-up':'📅 Follow-up Date'}
              </p>
              <p className="text-sm font-bold">{fmt(rx.follow_up_date)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
