import { useState, useCallback } from 'react'
import {
  Printer, ReceiptText, Package, CalendarDays,
  RefreshCw, X, Building2, Download, FileSpreadsheet,
} from 'lucide-react'
import { printApi } from '../../api/print.js'
import { hospitalApi } from '../../api/hospitals.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { Button } from '../../components/ui/Button.jsx'
import * as XLSX from 'xlsx'

const ANIMAL_EMOJIS = { COW:'🐄',BUFFALO:'🐃',GOAT:'🐐',DOG:'🐕',CAMEL:'🐪',HORSE:'🐎',SHEEP:'🐑',OTHER:'🐾' }

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
}
function fmtCur(n) { return '₹' + parseFloat(n||0).toLocaleString('en-IN', { minimumFractionDigits:2 }) }

// ── Master print function ─────────────────────────────────────
function doPrint(html) {
  const w = window.open('', '_blank', 'width=900,height=700')
  w.document.write(html)
  w.document.close()
  w.onload = () => setTimeout(() => w.print(), 300)
}

// ── Billing Summary HTML ──────────────────────────────────────
function buildBillingSummaryHTML(data) {
  const { date, hospital, bills, totalBills, totalRevenue, pendingAmount, byType, byPayment, paidCount, pendingCount } = data
  const title = hospital ? hospital.name : 'All Hospitals'

  return `<!DOCTYPE html><html><head><title>Billing Summary — ${date}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;padding:20px}
    .header{border-bottom:3px solid #1d4ed8;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between}
    .org{font-size:18px;font-weight:bold;color:#1d4ed8}
    .sub{font-size:11px;color:#64748b;margin-top:3px}
    .report-title{font-size:14px;font-weight:bold;color:#1a1a1a;margin-top:4px}
    .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
    .stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center}
    .stat-val{font-size:16px;font-weight:bold;color:#1d4ed8}
    .stat-lbl{font-size:10px;color:#64748b;margin-top:2px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
    .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px}
    .box-title{font-weight:bold;color:#1d4ed8;margin-bottom:6px;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
    .row{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #f1f5f9}
    .row:last-child{border-bottom:none}
    table{width:100%;border-collapse:collapse;font-size:10.5px}
    th{background:#1d4ed8;color:white;padding:7px 8px;text-align:left}
    td{padding:5px 8px;border-bottom:1px solid #f1f5f9}
    tr:nth-child(even){background:#f8fafc}
    .paid{color:#15803d;font-weight:bold}.pending{color:#b45309;font-weight:bold}.cancelled{color:#dc2626}
    .total-row{background:#e0e7ff!important;font-weight:bold}
    .footer{text-align:center;margin-top:20px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}
    @media print{@page{margin:1cm}}
  </style></head><body>
  <div class="header">
    <div>
      <div class="org">🐾 PashuCare ERP — ${title}</div>
      ${hospital ? `<div class="sub">${hospital.address||''} ${hospital.phone?'· '+hospital.phone:''}</div>` : ''}
      <div class="report-title">Daily Billing Summary — ${fmt(date)}</div>
    </div>
    <div style="text-align:right;font-size:10px;color:#94a3b8">Printed: ${new Date().toLocaleString('en-IN')}</div>
  </div>

  <div class="stats">
    <div class="stat"><div class="stat-val">${totalBills}</div><div class="stat-lbl">Total Bills</div></div>
    <div class="stat"><div class="stat-val paid">${paidCount}</div><div class="stat-lbl">Paid</div></div>
    <div class="stat"><div class="stat-val pending">${pendingCount}</div><div class="stat-lbl">Pending</div></div>
    <div class="stat"><div class="stat-val">${fmtCur(totalRevenue)}</div><div class="stat-lbl">Revenue Collected</div></div>
  </div>

  <div class="grid2">
    <div class="box">
      <div class="box-title">Revenue by Bill Type</div>
      ${Object.entries(byType).map(([k,v])=>`<div class="row"><span>${k}</span><span><b>${fmtCur(v)}</b></span></div>`).join('')}
    </div>
    <div class="box">
      <div class="box-title">Revenue by Payment Mode</div>
      ${Object.entries(byPayment).map(([k,v])=>`<div class="row"><span>${k.replace('_',' ')}</span><span><b>${fmtCur(v)}</b></span></div>`).join('')}
    </div>
  </div>

  <table>
    <thead><tr><th>#</th><th>Bill No.</th><th>Owner</th><th>Animal</th><th>Type</th><th>Items</th><th>Amount</th><th>Payment</th><th>Status</th></tr></thead>
    <tbody>
      ${bills.map((b,i)=>`<tr>
        <td>${i+1}</td>
        <td><b>${b.bill_number}</b></td>
        <td>${b.owner?.name}<br/><span style="color:#94a3b8;font-size:10px">${b.owner?.phone}</span></td>
        <td>${b.animal?(ANIMAL_EMOJIS[b.animal.animal_type]||'🐾')+' '+b.animal.animal_type+(b.animal.breed?' '+b.animal.breed:''):'—'}</td>
        <td>${b.bill_type}</td>
        <td style="font-size:10px">${b.items?.map(it=>it.item_name).slice(0,2).join(', ')||'—'}${b.items?.length>2?'...':''}</td>
        <td><b>${fmtCur(b.total_amount)}</b></td>
        <td>${b.payment_mode.replace('_',' ')}</td>
        <td class="${b.status.toLowerCase()}">${b.status}</td>
      </tr>`).join('')}
      <tr class="total-row">
        <td colspan="6" style="text-align:right">TOTAL COLLECTED</td>
        <td colspan="3">${fmtCur(totalRevenue)} &nbsp;|&nbsp; Pending: ${fmtCur(pendingAmount)}</td>
      </tr>
    </tbody>
  </table>
  <div class="footer">PashuCare ERP · Daily Billing Summary · ${fmt(date)} · Generated: ${new Date().toLocaleString('en-IN')}</div>
  </body></html>`
}

// ── Stock Report HTML ─────────────────────────────────────────
function buildStockReportHTML(data) {
  const { date, hospital, medStock, inventoryItems, summary } = data
  const title = hospital ? hospital.name : 'All Hospitals'

  return `<!DOCTYPE html><html><head><title>Stock Report — ${date}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;padding:20px}
    .header{border-bottom:3px solid #1d4ed8;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between}
    .org{font-size:18px;font-weight:bold;color:#1d4ed8}
    .sub{font-size:11px;color:#64748b;margin-top:3px}
    .report-title{font-size:14px;font-weight:bold;color:#1a1a1a;margin-top:4px}
    .stats{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:16px}
    .stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px;text-align:center}
    .stat-val{font-size:15px;font-weight:bold;color:#1d4ed8}
    .stat-lbl{font-size:9px;color:#64748b;margin-top:2px}
    .section-title{font-size:12px;font-weight:bold;color:#1d4ed8;border-bottom:1px solid #e2e8f0;padding-bottom:5px;margin:14px 0 8px}
    table{width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:16px}
    th{background:#1d4ed8;color:white;padding:7px 8px;text-align:left}
    td{padding:5px 8px;border-bottom:1px solid #f1f5f9}
    tr:nth-child(even){background:#f8fafc}
    .low{color:#dc2626;font-weight:bold}.expired{color:#dc2626}.expiring{color:#b45309}
    .ok{color:#15803d}
    .footer{text-align:center;margin-top:20px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}
    @media print{@page{margin:1cm}.section-title{page-break-before:auto}}
  </style></head><body>
  <div class="header">
    <div>
      <div class="org">🐾 PashuCare ERP — ${title}</div>
      ${hospital ? `<div class="sub">${hospital.address||''}</div>` : ''}
      <div class="report-title">Stock Report — ${fmt(date)}</div>
    </div>
    <div style="text-align:right;font-size:10px;color:#94a3b8">Printed: ${new Date().toLocaleString('en-IN')}</div>
  </div>

  <div class="stats">
    <div class="stat"><div class="stat-val">${summary.totalMedicines}</div><div class="stat-lbl">Medicines</div></div>
    <div class="stat"><div class="stat-val low">${summary.lowStock}</div><div class="stat-lbl">Low Stock</div></div>
    <div class="stat"><div class="stat-val expiring">${summary.expiring}</div><div class="stat-lbl">Expiring Soon</div></div>
    <div class="stat"><div class="stat-val expired">${summary.expired}</div><div class="stat-lbl">Expired</div></div>
    <div class="stat"><div class="stat-val">${summary.totalInventory}</div><div class="stat-lbl">Inventory Items</div></div>
    <div class="stat"><div class="stat-val low">${summary.lowInventory}</div><div class="stat-lbl">Low Inventory</div></div>
  </div>

  <div class="section-title">💊 Medicine Stock</div>
  <table>
    <thead><tr><th>#</th><th>Medicine</th><th>Category</th><th>Hospital</th><th>Qty</th><th>Unit</th><th>Batches</th><th>Earliest Expiry</th><th>Status</th></tr></thead>
    <tbody>
      ${medStock.map((s,i)=>{
        const isLow = s.total_qty <= (s.medicine?.min_stock_level||10)
        const earliest = s.batches.map(b=>b.expiry_date).sort()[0]
        const today2 = new Date().toISOString().split('T')[0]
        const expClass = !earliest?'ok':earliest<today2?'expired':Math.ceil((new Date(earliest)-new Date(today2))/(86400000))<=30?'expiring':'ok'
        return `<tr>
          <td>${i+1}</td>
          <td><b>${s.medicine?.name}</b>${s.medicine?.generic_name?`<br/><span style="color:#94a3b8;font-size:9px">${s.medicine.generic_name}</span>`:''}</td>
          <td>${s.medicine?.category}</td>
          <td>${s.hospital?.name||'—'}</td>
          <td class="${isLow?'low':'ok'}"><b>${s.total_qty}</b></td>
          <td>${s.medicine?.unit}</td>
          <td>${s.batches?.length}</td>
          <td class="${expClass}">${fmt(earliest)}</td>
          <td class="${expClass}">${s.expired?'EXPIRED':s.expiring?'EXPIRING SOON':isLow?'LOW STOCK':'OK'}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>

  ${inventoryItems.length ? `
  <div class="section-title">📦 Inventory Stock</div>
  <table>
    <thead><tr><th>#</th><th>Item</th><th>Category</th><th>Hospital</th><th>Qty</th><th>Unit</th><th>Expiry</th><th>Status</th></tr></thead>
    <tbody>
      ${inventoryItems.map((s,i)=>{
        const isLow = s.quantity <= (s.item?.min_stock_level||5)
        return `<tr>
          <td>${i+1}</td>
          <td><b>${s.item?.name}</b></td>
          <td>${s.item?.category}</td>
          <td>${s.hospital?.name||'—'}</td>
          <td class="${isLow?'low':'ok'}"><b>${s.quantity}</b></td>
          <td>${s.item?.unit}</td>
          <td>${s.expiry_date?fmt(s.expiry_date):'—'}</td>
          <td class="${isLow?'low':'ok'}">${isLow?'LOW STOCK':'OK'}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>` : ''}

  <div class="footer">PashuCare ERP · Stock Report · ${fmt(date)} · Generated: ${new Date().toLocaleString('en-IN')}</div>
  </body></html>`
}

// ── Appointment Queue HTML ────────────────────────────────────
function buildQueueHTML(data) {
  const { date, hospital, appointments, summary } = data
  const title = hospital ? hospital.name : 'All Hospitals'

  return `<!DOCTYPE html><html><head><title>Appointment Queue — ${date}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;padding:20px}
    .header{border-bottom:3px solid #1d4ed8;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between}
    .org{font-size:18px;font-weight:bold;color:#1d4ed8}
    .sub{font-size:11px;color:#64748b;margin-top:3px}
    .report-title{font-size:14px;font-weight:bold;margin-top:4px}
    .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
    .stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center}
    .stat-val{font-size:16px;font-weight:bold;color:#1d4ed8}
    .stat-lbl{font-size:10px;color:#64748b;margin-top:2px}
    table{width:100%;border-collapse:collapse;font-size:10.5px}
    th{background:#1d4ed8;color:white;padding:7px 8px;text-align:left}
    td{padding:6px 8px;border-bottom:1px solid #f1f5f9;vertical-align:top}
    tr:nth-child(even){background:#f8fafc}
    .emg{background:#fff1f2!important}
    .token{font-size:14px;font-weight:bold;color:#1d4ed8}
    .completed{color:#15803d}.pending{color:#b45309}.in_progress{color:#7c3aed}.cancelled{color:#dc2626}
    .footer{text-align:center;margin-top:20px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}
    @media print{@page{margin:1cm}}
  </style></head><body>
  <div class="header">
    <div>
      <div class="org">🐾 PashuCare ERP — ${title}</div>
      ${hospital ? `<div class="sub">${hospital.address||''} ${hospital.phone?'· '+hospital.phone:''}</div>` : ''}
      <div class="report-title">Appointment Queue — ${fmt(date)}</div>
    </div>
    <div style="text-align:right;font-size:10px;color:#94a3b8">Printed: ${new Date().toLocaleString('en-IN')}</div>
  </div>

  <div class="stats">
    <div class="stat"><div class="stat-val">${summary.total}</div><div class="stat-lbl">Total</div></div>
    <div class="stat"><div class="stat-val" style="color:#dc2626">${summary.emergency}</div><div class="stat-lbl">Emergency</div></div>
    <div class="stat"><div class="stat-val" style="color:#b45309">${summary.pending}</div><div class="stat-lbl">Pending</div></div>
    <div class="stat"><div class="stat-val" style="color:#15803d">${summary.completed}</div><div class="stat-lbl">Completed</div></div>
  </div>

  <table>
    <thead><tr><th>Token</th><th>Animal / Owner</th><th>Type</th><th>Doctor</th><th>Time</th><th>Status</th><th>Chief Complaint</th></tr></thead>
    <tbody>
      ${appointments.map(a=>`<tr class="${a.type==='EMERGENCY'?'emg':''}">
        <td class="token">${a.type==='EMERGENCY'?'🚨':('#'+a.token_number)}</td>
        <td>
          <b>${ANIMAL_EMOJIS[a.animal?.animal_type]||'🐾'} ${a.animal?.animal_type||'—'}${a.animal?.breed?' '+a.animal.breed:''}</b><br/>
          <span style="color:#64748b">${a.owner?.name} · ${a.owner?.phone}</span>
          ${a.owner?.village?`<br/><span style="color:#94a3b8;font-size:9px">${a.owner.village}</span>`:''}
        </td>
        <td>${a.type}</td>
        <td>${a.doctor?`Dr. ${a.doctor.name}`:'<span style="color:#b45309">Not assigned</span>'}</td>
        <td>${a.appointment_time||'—'}</td>
        <td class="${a.status.toLowerCase().replace('_',' ')}">${a.status}</td>
        <td style="font-size:10px;color:#64748b">${a.chief_complaint||'—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="footer">PashuCare ERP · Appointment Queue · ${fmt(date)} · Generated: ${new Date().toLocaleString('en-IN')}</div>
  </body></html>`
}

// ════════════════════════════════════════════════════════════
export default function PrintCenterPage() {
  const { getUser } = useAuth()
  const user = getUser()

  const [hospitals,      setHospitals]      = useState([])
  const [hospLoaded,     setHospLoaded]     = useState(false)
  const [selectedHosp,   setSelectedHosp]   = useState('')
  const [selectedDate,   setSelectedDate]   = useState(new Date().toISOString().split('T')[0])
  const [loading,        setLoading]        = useState({})
  const [exporting,      setExporting]      = useState(null) // 'billing'|'stock'|'queue'
  const [preview,        setPreview]        = useState(null)  // { type, data }
  const [toast,          setToast]          = useState(null)

  function showToast(msg, type='success') { setToast({message:msg,type}); setTimeout(()=>setToast(null),3500) }
  function setLoad(k,v) { setLoading(p=>({...p,[k]:v})) }

  // Load hospitals once
  async function ensureHospitals() {
    if (hospLoaded) return
    try {
      const r = await hospitalApi.list({ limit:100, status:'ACTIVE' })
      setHospitals(r.data.data.hospitals || [])
      if (user?.role === 'HOSPITAL_ADMIN') setSelectedHosp(user.hospital_id || '')
    } catch {}
    setHospLoaded(true)
  }

  const params = { date: selectedDate, hospital_id: selectedHosp || undefined }

  async function fetchAndPrint(type) {
    await ensureHospitals()
    setLoad(type, true)
    try {
      let data
      if (type === 'billing') {
        const r = await printApi.billingSummary(params)
        data = r.data.data
        doPrint(buildBillingSummaryHTML(data))
      } else if (type === 'stock') {
        const r = await printApi.stockReport({ hospital_id: selectedHosp || undefined })
        data = r.data.data
        doPrint(buildStockReportHTML(data))
      } else if (type === 'queue') {
        const r = await printApi.appointmentQueue(params)
        data = r.data.data
        doPrint(buildQueueHTML(data))
      }
      showToast('Opening print dialog…')
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to generate report', 'error')
    } finally { setLoad(type, false) }
  }

  async function fetchPreview(type) {
    await ensureHospitals()
    setLoad('preview_'+type, true)
    try {
      let data
      if (type === 'billing') {
        const r = await printApi.billingSummary(params)
        data = r.data.data
      } else if (type === 'stock') {
        const r = await printApi.stockReport({ hospital_id: selectedHosp || undefined })
        data = r.data.data
      } else if (type === 'queue') {
        const r = await printApi.appointmentQueue(params)
        data = r.data.data
      }
      setPreview({ type, data })
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to load preview', 'error')
    } finally { setLoad('preview_'+type, false) }
  }


  async function handleExportBilling() {
    await ensureHospitals()
    setExporting('billing')
    try {
      const r = await printApi.billingSummary(params)
      const d = r.data.data

      const wb = XLSX.utils.book_new()

      // Summary sheet
      const sumRows = [
        ['Daily Billing Summary', d.date],
        ['Hospital', d.hospital?.name || 'All Hospitals'],
        [],
        ['Metric','Value'],
        ['Total Bills', d.totalBills],
        ['Paid Bills', d.paidCount],
        ['Pending Bills', d.pendingCount],
        ['Revenue Collected', parseFloat(d.totalRevenue||0).toFixed(2)],
        ['Pending Amount', parseFloat(d.pendingAmount||0).toFixed(2)],
        [],
        ['Revenue by Bill Type'],
        ['Type','Amount (₹)'],
        ...Object.entries(d.byType||{}).map(([k,v]) => [k, parseFloat(v).toFixed(2)]),
        [],
        ['Revenue by Payment Mode'],
        ['Mode','Amount (₹)'],
        ...Object.entries(d.byPayment||{}).map(([k,v]) => [k.replace('_',' '), parseFloat(v).toFixed(2)]),
      ]
      const wsSum = XLSX.utils.aoa_to_sheet(sumRows)
      wsSum['!cols'] = [{ wch:25 },{ wch:20 }]
      XLSX.utils.book_append_sheet(wb, wsSum, 'Summary')

      // Bills detail sheet
      const billRows = [
        ['Bill No.','Owner','Phone','Animal','Bill Type','Items','Amount (₹)','Payment Mode','Status'],
        ...(d.bills||[]).map(b => [
          b.bill_number,
          b.owner?.name || '—',
          b.owner?.phone || '—',
          b.animal ? b.animal.animal_type + (b.animal.breed ? ' ' + b.animal.breed : '') : '—',
          b.bill_type,
          b.items?.map(i => i.item_name).join(', ') || '—',
          parseFloat(b.total_amount).toFixed(2),
          b.payment_mode.replace('_',' '),
          b.status,
        ])
      ]
      const wsBills = XLSX.utils.aoa_to_sheet(billRows)
      wsBills['!cols'] = [{ wch:18 },{ wch:22 },{ wch:14 },{ wch:18 },{ wch:14 },{ wch:30 },{ wch:12 },{ wch:16 },{ wch:12 }]
      XLSX.utils.book_append_sheet(wb, wsBills, 'Bills Detail')

      XLSX.writeFile(wb, 'billing_summary_' + d.date + '.xlsx')
      showToast('Billing summary exported')
    } catch (err) {
      showToast(err?.response?.data?.message || 'Export failed', 'error')
    } finally { setExporting(null) }
  }

  async function handleExportStock() {
    await ensureHospitals()
    setExporting('stock')
    try {
      const r = await printApi.stockReport({ hospital_id: selectedHosp || undefined })
      const d = r.data.data

      const wb = XLSX.utils.book_new()

      // Medicine stock
      const medRows = [
        ['Medicine Stock Report', d.date],
        ['Hospital', d.hospital?.name || 'All Hospitals'],
        [],
        ['Medicine','Category','Hospital','Total Qty','Unit','Batches','Earliest Expiry','Status'],
        ...(d.medStock||[]).map(s => {
          const earliest = s.batches?.map(b => b.expiry_date).sort()[0]
          const today = new Date().toISOString().split('T')[0]
          const isLow = s.total_qty <= (s.medicine?.min_stock_level||10)
          const isExp = earliest && earliest < today
          const isExp30 = earliest && !isExp && Math.ceil((new Date(earliest)-new Date(today))/(86400000)) <= 30
          return [
            s.medicine?.name,
            s.medicine?.category,
            s.hospital?.name || '—',
            s.total_qty,
            s.medicine?.unit,
            s.batches?.length,
            earliest || '—',
            isExp ? 'EXPIRED' : isExp30 ? 'EXPIRING SOON' : isLow ? 'LOW STOCK' : 'OK',
          ]
        })
      ]
      const wsMed = XLSX.utils.aoa_to_sheet(medRows)
      wsMed['!cols'] = [{ wch:28 },{ wch:14 },{ wch:22 },{ wch:10 },{ wch:10 },{ wch:10 },{ wch:16 },{ wch:16 }]
      XLSX.utils.book_append_sheet(wb, wsMed, 'Medicine Stock')

      // Inventory
      if (d.inventoryItems?.length) {
        const invRows = [
          ['Item','Category','Hospital','Qty','Unit','Expiry','Status'],
          ...(d.inventoryItems||[]).map(s => [
            s.item?.name, s.item?.category, s.hospital?.name || '—',
            s.quantity, s.item?.unit,
            s.expiry_date || '—',
            s.quantity <= (s.item?.min_stock_level||5) ? 'LOW STOCK' : 'OK',
          ])
        ]
        const wsInv = XLSX.utils.aoa_to_sheet(invRows)
        wsInv['!cols'] = [{ wch:28 },{ wch:16 },{ wch:22 },{ wch:10 },{ wch:10 },{ wch:14 },{ wch:14 }]
        XLSX.utils.book_append_sheet(wb, wsInv, 'Inventory')
      }

      XLSX.writeFile(wb, 'stock_report_' + d.date + '.xlsx')
      showToast('Stock report exported')
    } catch (err) {
      showToast(err?.response?.data?.message || 'Export failed', 'error')
    } finally { setExporting(null) }
  }

  async function handleExportQueue() {
    await ensureHospitals()
    setExporting('queue')
    try {
      const r = await printApi.appointmentQueue(params)
      const d = r.data.data

      const wb = XLSX.utils.book_new()
      const rows = [
        ['Appointment Queue', d.date],
        ['Hospital', d.hospital?.name || 'All Hospitals'],
        ['Total', d.summary.total, 'Emergency', d.summary.emergency, 'Pending', d.summary.pending, 'Completed', d.summary.completed],
        [],
        ['Token','Animal Type','Breed','Owner Name','Phone','Village','Doctor','Type','Time','Status','Chief Complaint'],
        ...(d.appointments||[]).map(a => [
          a.type === 'EMERGENCY' ? 'EMERGENCY' : ('#' + a.token_number),
          a.animal?.animal_type || '—',
          a.animal?.breed || '—',
          a.owner?.name || '—',
          a.owner?.phone || '—',
          a.owner?.village || '—',
          a.doctor ? 'Dr. ' + a.doctor.name : 'Not assigned',
          a.type,
          a.appointment_time || '—',
          a.status,
          a.chief_complaint || '—',
        ])
      ]
      const ws = XLSX.utils.aoa_to_sheet(rows)
      ws['!cols'] = [{ wch:12 },{ wch:14 },{ wch:12 },{ wch:22 },{ wch:14 },{ wch:16 },{ wch:22 },{ wch:12 },{ wch:10 },{ wch:14 },{ wch:28 }]
      XLSX.utils.book_append_sheet(wb, ws, 'Queue')
      XLSX.writeFile(wb, 'appointment_queue_' + d.date + '.xlsx')
      showToast('Appointment queue exported')
    } catch (err) {
      showToast(err?.response?.data?.message || 'Export failed', 'error')
    } finally { setExporting(null) }
  }

  const REPORTS = [
    {
      id: 'billing',
      label: 'Daily Billing Summary',
      icon: ReceiptText,
      color: 'bg-blue-50 text-blue-700',
      desc: 'All bills for a selected date — revenue collected, pending amount, breakdown by type and payment mode',
      needsDate: true,
    },
    {
      id: 'queue',
      label: 'Appointment Queue',
      icon: CalendarDays,
      color: 'bg-green-50 text-green-700',
      desc: 'Today\'s appointment list with token numbers, animal details, owner, doctor, and status',
      needsDate: true,
    },
    {
      id: 'stock',
      label: 'Stock Report',
      icon: Package,
      color: 'bg-purple-50 text-purple-700',
      desc: 'Current medicine and inventory stock levels — includes low stock alerts and expiry warnings',
      needsDate: false,
    },
  ]

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {toast && (
        <div className={'fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in ' +
          (toast.type==='error'?'bg-red-600 text-white':'bg-green-600 text-white')}>
          {toast.message}<button onClick={()=>setToast(null)}><X size={14}/></button>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">Print Center</h1>
        <p className="text-sm text-slate-500 mt-1">Generate and print reports directly from your browser</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Date</label>
          <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} className="input-base h-9 text-sm w-40"/>
        </div>
        {user?.role !== 'HOSPITAL_ADMIN' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Hospital (optional)</label>
            <select value={selectedHosp} onChange={e=>setSelectedHosp(e.target.value)}
              onFocus={ensureHospitals} className="input-base h-9 text-sm w-52">
              <option value="">All hospitals</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {REPORTS.map(r => (
          <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col">
            <div className={'w-10 h-10 rounded-xl flex items-center justify-center mb-3 flex-shrink-0 ' + r.color}>
              <r.icon size={18}/>
            </div>
            <h3 className="font-display text-sm font-bold text-slate-800">{r.label}</h3>
            <p className="text-xs text-slate-400 mt-1 flex-1">{r.desc}</p>
            <div className="flex gap-2 mt-4 flex-wrap">
              <Button variant="secondary" size="sm"
                loading={loading['preview_'+r.id]}
                onClick={() => fetchPreview(r.id)}>
                Preview
              </Button>
              <Button size="sm" icon={Printer}
                loading={loading[r.id]}
                onClick={() => fetchAndPrint(r.id)}>
                Print
              </Button>
              <button
                disabled={exporting === r.id}
                onClick={() => r.id==='billing'?handleExportBilling():r.id==='stock'?handleExportStock():handleExportQueue()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 disabled:opacity-50 transition-colors whitespace-nowrap">
                <FileSpreadsheet size={13}/>{exporting===r.id ? 'Exporting…' : 'Export'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview panel */}
      {preview && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">
              {REPORTS.find(r=>r.id===preview.type)?.label} — Preview
            </h3>
            <div className="flex items-center gap-2">
              <Button size="sm" icon={Printer} onClick={() => fetchAndPrint(preview.type)}>Print</Button>
              <button onClick={() => setPreview(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={14}/></button>
            </div>
          </div>

          <div className="p-5 overflow-x-auto">

            {/* Billing preview */}
            {preview.type === 'billing' && (() => {
              const d = preview.data
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[['Total Bills', d.totalBills, 'blue'], ['Paid', d.paidCount, 'green'], ['Pending', d.pendingCount, 'amber'], ['Revenue', '₹'+parseFloat(d.totalRevenue||0).toLocaleString('en-IN'), 'green']].map(([l,v,c])=>(
                      <div key={l} className={`rounded-xl p-3 text-center bg-${c}-50 border border-${c}-200`}>
                        <div className={`text-xl font-bold text-${c}-700`}>{v}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-slate-50 border-b border-slate-200">
                        {['Bill No.','Owner','Animal','Type','Amount','Status'].map(h=><th key={h} className="text-left px-3 py-2 font-semibold text-slate-500">{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {d.bills?.map(b=>(
                          <tr key={b.id} className="border-b border-slate-50">
                            <td className="px-3 py-2 font-mono text-primary-600 font-semibold">{b.bill_number}</td>
                            <td className="px-3 py-2">{b.owner?.name}<br/><span className="text-slate-400">{b.owner?.phone}</span></td>
                            <td className="px-3 py-2">{b.animal?(ANIMAL_EMOJIS[b.animal.animal_type]||'🐾')+' '+b.animal.animal_type:'—'}</td>
                            <td className="px-3 py-2">{b.bill_type}</td>
                            <td className="px-3 py-2 font-bold">₹{parseFloat(b.total_amount).toFixed(2)}</td>
                            <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.status==='PAID'?'bg-green-50 text-green-700':b.status==='PENDING'?'bg-amber-50 text-amber-700':'bg-red-50 text-red-600'}`}>{b.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}

            {/* Stock preview */}
            {preview.type === 'stock' && (() => {
              const d = preview.data
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[['Medicines',d.summary.totalMedicines,'blue'],['Low Stock',d.summary.lowStock,'red'],['Expiring',d.summary.expiring,'amber'],['Expired',d.summary.expired,'red'],['Inventory',d.summary.totalInventory,'purple'],['Low Inv.',d.summary.lowInventory,'red']].map(([l,v,c])=>(
                      <div key={l} className={`rounded-xl p-2.5 text-center bg-${c}-50 border border-${c}-200`}>
                        <div className={`text-lg font-bold text-${c}-700`}>{v}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-slate-50 border-b border-slate-200">
                        {['Medicine','Qty','Unit','Batches','Earliest Expiry','Alert'].map(h=><th key={h} className="text-left px-3 py-2 font-semibold text-slate-500">{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {d.medStock?.slice(0,20).map((s,i)=>{
                          const isLow = s.total_qty <= (s.medicine?.min_stock_level||10)
                          const earliest = s.batches?.map(b=>b.expiry_date).sort()[0]
                          const today = new Date().toISOString().split('T')[0]
                          const isExp = earliest && earliest < today
                          const isExp30 = earliest && !isExp && Math.ceil((new Date(earliest)-new Date(today))/(86400000))<=30
                          return (
                            <tr key={i} className="border-b border-slate-50">
                              <td className="px-3 py-2 font-medium">{s.medicine?.name}</td>
                              <td className={'px-3 py-2 font-bold '+(isLow?'text-red-600':'text-green-700')}>{s.total_qty}</td>
                              <td className="px-3 py-2 text-slate-500">{s.medicine?.unit}</td>
                              <td className="px-3 py-2">{s.batches?.length}</td>
                              <td className={'px-3 py-2 '+(isExp?'text-red-600 font-bold':isExp30?'text-amber-600 font-semibold':'text-slate-600')}>{fmt(earliest)}</td>
                              <td className="px-3 py-2">{isExp?<span className="text-red-600 font-bold">EXPIRED</span>:isExp30?<span className="text-amber-600 font-semibold">EXPIRING</span>:isLow?<span className="text-red-600 font-bold">LOW</span>:<span className="text-green-600">OK</span>}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {d.medStock?.length > 20 && <p className="text-xs text-slate-400 mt-2 text-center">+ {d.medStock.length-20} more in printed report</p>}
                  </div>
                </div>
              )
            })()}

            {/* Queue preview */}
            {preview.type === 'queue' && (() => {
              const d = preview.data
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    {[['Total',d.summary.total,'blue'],['Emergency',d.summary.emergency,'red'],['Pending',d.summary.pending,'amber'],['Completed',d.summary.completed,'green']].map(([l,v,c])=>(
                      <div key={l} className={`rounded-xl p-3 text-center bg-${c}-50 border border-${c}-200`}>
                        <div className={`text-xl font-bold text-${c}-700`}>{v}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-slate-50 border-b border-slate-200">
                        {['Token','Animal','Owner','Doctor','Time','Status'].map(h=><th key={h} className="text-left px-3 py-2 font-semibold text-slate-500">{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {d.appointments?.map(a=>(
                          <tr key={a.id} className={'border-b border-slate-50 '+(a.type==='EMERGENCY'?'bg-red-50/40':'')}>
                            <td className="px-3 py-2 font-bold text-primary-700">{a.type==='EMERGENCY'?'🚨':'#'+a.token_number}</td>
                            <td className="px-3 py-2">{ANIMAL_EMOJIS[a.animal?.animal_type]||'🐾'} {a.animal?.animal_type}{a.animal?.breed?' · '+a.animal.breed:''}</td>
                            <td className="px-3 py-2">{a.owner?.name}<br/><span className="text-slate-400">{a.owner?.phone}</span></td>
                            <td className="px-3 py-2">{a.doctor?'Dr. '+a.doctor.name:<span className="text-amber-500">Not assigned</span>}</td>
                            <td className="px-3 py-2">{a.appointment_time||'—'}</td>
                            <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.status==='COMPLETED'?'bg-green-50 text-green-700':a.status==='PENDING'?'bg-amber-50 text-amber-700':a.status==='IN_PROGRESS'?'bg-purple-50 text-purple-700':'bg-slate-100 text-slate-500'}`}>{a.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}

          </div>
        </div>
      )}
    </div>
  )
}
