import { useState, useEffect } from 'react'
import { X, ReceiptText, Printer, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { billingApi } from '../../api/billing.js'
import { emailApi  } from '../../api/email.js'
import { Button } from '../ui/Button.jsx'

const STATUS_COLORS = {
  PENDING:        'bg-amber-50 text-amber-700 border-amber-200',
  PAID:           'bg-green-50 text-green-700 border-green-200',
  PARTIALLY_PAID: 'bg-blue-50 text-blue-700 border-blue-200',
  CANCELLED:      'bg-red-50 text-red-600 border-red-200',
}

const PAYMENT_LABELS = {
  CASH:'Cash', UPI:'UPI', CARD:'Card',
  GOVT_SUBSIDY:'Govt Subsidy', FREE:'Free Treatment', INSURANCE:'Insurance',
}

export function BillDetailDrawer({ billId, open, onClose, onPaid, canPay }) {
  const [bill,    setBill]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [paying,   setPaying]   = useState(false)
  const [payMode,  setPayMode]  = useState('CASH')
  const [emailing, setEmailing] = useState(false)
  const [emailAddr,setEmailAddr]= useState('')
  const [emailSent,setEmailSent]= useState(false)

  useEffect(() => {
    if (!open || !billId) return
    setLoading(true)
    billingApi.getOne(billId)
      .then(r => { setBill(r.data.data); setEmailAddr(r.data.data?.owner?.email||''); setEmailSent(false) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, billId])

  async function handleSendEmail() {
    if (!emailAddr) return
    setEmailing(true)
    try {
      await emailApi.sendBill(billId, { email: emailAddr })
      setEmailSent(true)
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to send email')
    } finally { setEmailing(false) }
  }

  async function handlePay() {
    setPaying(true)
    try {
      await billingApi.pay(billId, { payment_mode: payMode, paid_amount: bill.total_amount })
      const r = await billingApi.getOne(billId)
      setBill(r.data.data)
      onPaid?.()
    } catch (err) {
      alert(err?.response?.data?.message || 'Payment failed')
    } finally { setPaying(false) }
  }

  function printBill() {
    if (!bill) return
    const ANIMAL_EMOJIS = { COW:'🐄', BUFFALO:'🐃', GOAT:'🐐', DOG:'🐕', CAMEL:'🐪', HORSE:'🐎', SHEEP:'🐑', OTHER:'🐾' }
    const html = `
      <!DOCTYPE html><html><head>
      <title>Bill ${bill.bill_number}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 20px; max-width: 600px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #1d4ed8; padding-bottom: 12px; margin-bottom: 16px; }
        .hospital-name { font-size: 18px; font-weight: bold; color: #1d4ed8; }
        .bill-title { font-size: 14px; font-weight: bold; margin-top: 12px; background: #f0f4f8; padding: 6px 12px; border-radius: 6px; display: inline-block; }
        .section { margin-bottom: 14px; }
        .section-title { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 6px; }
        .row { display: flex; justify-content: space-between; padding: 3px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #1d4ed8; color: white; padding: 8px; text-align: left; font-size: 11px; }
        td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
        .total-row { font-weight: bold; background: #f8fafc; }
        .grand-total { font-size: 14px; font-weight: bold; color: #1d4ed8; }
        .status-badge { padding: 3px 10px; border-radius: 99px; font-weight: bold; font-size: 11px;
          background: ${bill.status==='PAID'?'#dcfce7':bill.status==='PENDING'?'#fef3c7':'#fee2e2'};
          color: ${bill.status==='PAID'?'#15803d':bill.status==='PENDING'?'#b45309':'#dc2626'}; }
        .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        @media print { button { display: none; } }
      </style></head><body>
      <div class="header">
        <div class="hospital-name">🐾 ${bill.hospital?.name || 'PashuCare'}</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px">${bill.hospital?.address||''} ${bill.hospital?.phone?'· Ph: '+bill.hospital.phone:''}</div>
        <div class="bill-title">VETERINARY BILL — ${bill.bill_type}</div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:16px">
        <div><b>Bill No:</b> ${bill.bill_number}<br/><b>Date:</b> ${bill.bill_date}<br/><b>Type:</b> ${bill.bill_type}</div>
        <div style="text-align:right"><span class="status-badge">${bill.status}</span><br/><b>Payment:</b> ${PAYMENT_LABELS[bill.payment_mode]||bill.payment_mode}</div>
      </div>
      <div class="section">
        <div class="section-title">Owner / Patient Details</div>
        <div><b>Owner:</b> ${bill.owner?.name} &nbsp;|&nbsp; <b>Phone:</b> ${bill.owner?.phone}</div>
        ${bill.owner?.address ? '<div><b>Address:</b> '+bill.owner.address+'</div>' : ''}
        ${bill.animal ? '<div style="margin-top:4px"><b>Animal:</b> '+(ANIMAL_EMOJIS[bill.animal.animal_type]||'🐾')+' '+bill.animal.animal_type+(bill.animal.breed?' · '+bill.animal.breed:'')+(bill.animal.name?' "'+bill.animal.name+'"':'')+'</div>' : ''}
      </div>
      <div class="section">
        <div class="section-title">Bill Items</div>
        <table>
          <thead><tr><th>#</th><th>Description</th><th>Type</th><th>Qty</th><th>Rate (₹)</th><th>GST%</th><th>Amount (₹)</th></tr></thead>
          <tbody>
            ${bill.items?.map((it,i) => `<tr><td>${i+1}</td><td>${it.item_name}</td><td>${it.item_type}</td><td>${it.quantity}</td><td>${parseFloat(it.unit_price).toFixed(2)}</td><td>${it.tax_pct}%</td><td>${parseFloat(it.amount).toFixed(2)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-left:auto;max-width:250px;margin-top:12px">
        <div class="row"><span>Subtotal</span><span>₹ ${parseFloat(bill.subtotal).toFixed(2)}</span></div>
        <div class="row"><span>GST / Tax</span><span>₹ ${parseFloat(bill.tax_amount).toFixed(2)}</span></div>
        ${parseFloat(bill.discount_amount)>0?'<div class="row"><span>Discount</span><span>- ₹ '+parseFloat(bill.discount_amount).toFixed(2)+'</span></div>':''}
        <div class="row grand-total" style="border-top:2px solid #1d4ed8;padding-top:6px;margin-top:4px"><span>Grand Total</span><span>₹ ${parseFloat(bill.total_amount).toFixed(2)}</span></div>
        ${bill.status==='PAID'?'<div class="row" style="color:#15803d"><span>Paid Amount</span><span>₹ '+parseFloat(bill.paid_amount).toFixed(2)+'</span></div>':''}
      </div>
      <div class="footer">Thank you for visiting ${bill.hospital?.name||'PashuCare Veterinary Hospital'}<br/>This is a computer generated bill.</div>
      </body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.onload = () => { w.print() }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose}/>
      <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-xl flex flex-col animate-slide-in">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <ReceiptText size={20} className="text-blue-600"/>
            <div>
              <h2 className="font-display text-base font-bold text-slate-800">{bill?.bill_number || 'Bill Details'}</h2>
              <p className="text-xs text-slate-400">{bill?.bill_type} · {bill?.bill_date}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {bill && <button onClick={printBill} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500" title="Print"><Printer size={16}/></button>}
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-slate-300"/></div>
        ) : !bill ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Failed to load bill</div>
        ) : (
          <div className="flex-1 p-4 space-y-4">

            {/* Status + Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[bill.status]||''}`}>{bill.status}</span>
                <span className="text-xs text-slate-400">{PAYMENT_LABELS[bill.payment_mode]}</span>
              </div>
              <div className="text-2xl font-display font-bold text-slate-800">₹ {parseFloat(bill.total_amount).toFixed(2)}</div>
              {bill.status === 'PAID' && <p className="text-xs text-green-600 mt-1">Paid: ₹ {parseFloat(bill.paid_amount).toFixed(2)} {bill.paid_at ? '· '+new Date(bill.paid_at).toLocaleDateString('en-IN') : ''}</p>}
            </div>

            {/* Send Email */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Send Receipt by Email</p>
              {emailSent ? (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  <CheckCircle2 size={15}/> Receipt sent successfully!
                </div>
              ) : (
                <div className="flex gap-2">
                  <input type="email" placeholder="Owner email address"
                    value={emailAddr} onChange={e => setEmailAddr(e.target.value)}
                    className="input-base flex-1 text-sm h-9"/>
                  <button onClick={handleSendEmail} disabled={emailing||!emailAddr}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold disabled:opacity-50 transition-colors whitespace-nowrap">
                    <Mail size={13}/>{emailing ? 'Sending…' : 'Send'}
                  </button>
                </div>
              )}
            </div>

            {/* Owner & Animal */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Owner / Patient</p>
              <p className="font-semibold text-slate-800">{bill.owner?.name}</p>
              <p className="text-sm text-slate-500">{bill.owner?.phone}</p>
              {bill.owner?.village && <p className="text-xs text-slate-400 mt-0.5">{bill.owner.village}</p>}
              {bill.animal && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500">Animal: {bill.animal.animal_type}{bill.animal.breed?' · '+bill.animal.breed:''}{bill.animal.name?' "'+bill.animal.name+'"':''}</p>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Bill Items ({bill.items?.length||0})</p>
              </div>
              {bill.items?.map((it, i) => (
                <div key={it.id} className="flex items-start justify-between px-4 py-3 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{it.item_name}</p>
                    <p className="text-xs text-slate-400">{it.item_type} · Qty: {it.quantity} × ₹{parseFloat(it.unit_price).toFixed(2)}{parseFloat(it.tax_pct)>0?' + '+it.tax_pct+'% GST':''}</p>
                  </div>
                  <span className="font-semibold text-slate-700 ml-4 flex-shrink-0">₹{parseFloat(it.amount).toFixed(2)}</span>
                </div>
              ))}
              <div className="px-4 py-3 bg-slate-50 space-y-1.5">
                <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>₹{parseFloat(bill.subtotal).toFixed(2)}</span></div>
                <div className="flex justify-between text-sm text-slate-600"><span>GST</span><span>₹{parseFloat(bill.tax_amount).toFixed(2)}</span></div>
                {parseFloat(bill.discount_amount)>0 && <div className="flex justify-between text-sm text-green-600"><span>Discount ({bill.discount_pct}%)</span><span>-₹{parseFloat(bill.discount_amount).toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-2"><span>Total</span><span>₹{parseFloat(bill.total_amount).toFixed(2)}</span></div>
              </div>
            </div>

            {/* Pay button */}
            {bill.status === 'PENDING' && canPay && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700">Record Payment</p>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_MODES.slice(0,3).map(m => (
                    <button key={m.value} type="button" onClick={() => setPayMode(m.value)}
                      className={'py-2 rounded-xl text-xs font-semibold border-2 transition-all ' +
                        (payMode===m.value?'border-primary-600 bg-primary-50 text-primary-700':'border-slate-200 text-slate-500 hover:border-slate-300')}>
                      {m.label}
                    </button>
                  ))}
                  {PAYMENT_MODES.slice(3).map(m => (
                    <button key={m.value} type="button" onClick={() => setPayMode(m.value)}
                      className={'py-2 rounded-xl text-xs font-semibold border-2 transition-all ' +
                        (payMode===m.value?'border-primary-600 bg-primary-50 text-primary-700':'border-slate-200 text-slate-500 hover:border-slate-300')}>
                      {m.label}
                    </button>
                  ))}
                </div>
                <Button fullWidth loading={paying} icon={CheckCircle2} onClick={handlePay}>
                  Mark as Paid · ₹{parseFloat(bill.total_amount).toFixed(2)}
                </Button>
              </div>
            )}

            {bill.notes && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-xs font-semibold text-slate-400 mb-1">Notes</p>
                <p className="text-sm text-slate-600">{bill.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const PAYMENT_MODES = [
  { value:'CASH', label:'Cash' }, { value:'UPI', label:'UPI' }, { value:'CARD', label:'Card' },
  { value:'GOVT_SUBSIDY', label:'Govt Subsidy' }, { value:'FREE', label:'Free' }, { value:'INSURANCE', label:'Insurance' },
]
