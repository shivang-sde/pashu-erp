import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  BarChart3, TrendingUp, PawPrint, Pill, ReceiptText,
  Building2, Syringe, IndianRupee, RefreshCw, Calendar,
  AlertTriangle, CheckCircle2, Download, Printer,
} from 'lucide-react'
import { reportsApi } from '../../api/reports.js'
import { useAuth }    from '../../hooks/useAuth.jsx'
import * as XLSX from 'xlsx'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const COLORS = ['#1d4ed8','#15803d','#b45309','#7c3aed','#0f766e','#dc2626','#0369a1','#be185d','#92400e','#047857']

const ANIMAL_COLORS = {
  COW:'#f59e0b', BUFFALO:'#64748b', GOAT:'#22c55e', DOG:'#f97316',
  CAMEL:'#eab308', HORSE:'#8b5cf6', SHEEP:'#06b6d4', OTHER:'#94a3b8',
}

const PAYMENT_COLORS = {
  CASH:'#1d4ed8', UPI:'#15803d', CARD:'#7c3aed',
  GOVT_SUBSIDY:'#b45309', FREE:'#0f766e', INSURANCE:'#dc2626',
}

function SectionCard({ title, icon:Icon, color, children, loading }) {
  const colors = {
    blue:'text-blue-600 bg-blue-50', green:'text-green-600 bg-green-50',
    amber:'text-amber-600 bg-amber-50', purple:'text-purple-600 bg-purple-50',
    red:'text-red-600 bg-red-50', teal:'text-teal-600 bg-teal-50',
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className={'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ' + (colors[color]||colors.blue)}>
          <Icon size={16}/>
        </div>
        <h3 className="font-display text-sm font-bold text-slate-800">{title}</h3>
        {loading && <RefreshCw size={13} className="animate-spin text-slate-300 ml-auto"/>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function StatBox({ label, value, sub, color='blue' }) {
  const colors = {
    blue:'bg-blue-50 text-blue-700', green:'bg-green-50 text-green-700',
    amber:'bg-amber-50 text-amber-700', red:'bg-red-50 text-red-700',
  }
  return (
    <div className={'rounded-xl p-4 ' + (colors[color]||colors.blue)}>
      <div className="text-2xl font-display font-bold">{value ?? 0}</div>
      <div className="text-xs font-medium mt-1 opacity-80">{label}</div>
      {sub && <div className="text-xs opacity-60 mt-0.5">{sub}</div>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card p-3">
      <p className="text-xs font-semibold text-slate-600 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === 'number' && p.value > 1000 ? '₹'+p.value.toLocaleString('en-IN') : p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function ReportsPage() {
  const { getUser } = useAuth()
  const user = getUser()
  const isAdmin = ['STATE_ADMIN','DISTRICT_ADMIN'].includes(user?.role)
  const isHospital = user?.role === 'HOSPITAL_ADMIN'

  const [year,     setYear]     = useState(new Date().getFullYear())
  const [overview, setOverview] = useState(null)
  const [apptData, setApptData] = useState([])
  const [revData,  setRevData]  = useState([])
  const [animals,  setAnimals]  = useState([])
  const [diseases, setDiseases] = useState([])
  const [medicines,setMedicines]= useState([])
  const [billing,  setBilling]  = useState([])
  const [hospitals,setHospitals]= useState([])
  const [vacc,     setVacc]     = useState(null)
  const [payments, setPayments] = useState([])
  const [loading,  setLoading]  = useState({})
  const [exporting, setExporting] = useState(false)
  const [printing,  setPrinting]  = useState(false)

  function setLoad(key, val) { setLoading(p => ({ ...p, [key]: val })) }

  const loadAll = useCallback(async () => {
    // Overview
    setLoad('overview', true)
    reportsApi.overview().then(r => setOverview(r.data.data)).catch(()=>{}).finally(() => setLoad('overview', false))

    // Appointments by month
    setLoad('appt', true)
    reportsApi.appointmentsByMonth({ year }).then(r => setApptData(r.data.data.map(d => ({ ...d, name: MONTH_NAMES[d.month-1] })))).catch(()=>{}).finally(() => setLoad('appt', false))

    // Revenue by month (admins only)
    if (isAdmin || isHospital) {
      setLoad('rev', true)
      reportsApi.revenueByMonth({ year }).then(r => setRevData(r.data.data.map(d => ({ ...d, name: MONTH_NAMES[d.month-1] })))).catch(()=>{}).finally(() => setLoad('rev', false))
    }

    // Animals by type
    setLoad('animals', true)
    reportsApi.animalsByType().then(r => setAnimals(r.data.data)).catch(()=>{}).finally(() => setLoad('animals', false))

    // Disease analysis
    setLoad('disease', true)
    reportsApi.diseaseAnalysis({ limit: 8 }).then(r => setDiseases(r.data.data)).catch(()=>{}).finally(() => setLoad('disease', false))

    // Medicine consumption
    setLoad('medicine', true)
    reportsApi.medicineConsumption({ limit: 8 }).then(r => setMedicines(r.data.data)).catch(()=>{}).finally(() => setLoad('medicine', false))

    // Billing by type
    if (isAdmin || isHospital) {
      setLoad('billing', true)
      reportsApi.billingByType().then(r => setBilling(r.data.data)).catch(()=>{}).finally(() => setLoad('billing', false))
    }

    // Hospital performance (state/district admin)
    if (isAdmin) {
      setLoad('hospitals', true)
      reportsApi.hospitalPerformance().then(r => setHospitals(r.data.data)).catch(()=>{}).finally(() => setLoad('hospitals', false))
    }

    // Vaccination summary
    setLoad('vacc', true)
    reportsApi.vaccinationSummary().then(r => setVacc(r.data.data)).catch(()=>{}).finally(() => setLoad('vacc', false))

    // Payment breakdown
    if (isAdmin || isHospital) {
      setLoad('payments', true)
      reportsApi.paymentModeBreakdown().then(r => setPayments(r.data.data)).catch(()=>{}).finally(() => setLoad('payments', false))
    }
  }, [year, isAdmin, isHospital])

  useEffect(() => { loadAll() }, [year])

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)



  function handlePrint() {
    setPrinting(true)
    const MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const today = new Date().toLocaleString('en-IN')

    const html = `<!DOCTYPE html><html><head>
    <title>PashuCare Analytics Report — ${year}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;padding:20px}
      .header{border-bottom:3px solid #1d4ed8;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between}
      .title{font-size:20px;font-weight:bold;color:#1d4ed8}
      .sub{font-size:11px;color:#64748b;margin-top:3px}
      .print-date{font-size:10px;color:#94a3b8;text-align:right}
      .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
      .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center}
      .kpi-val{font-size:16px;font-weight:bold;color:#1d4ed8}
      .kpi-lbl{font-size:10px;color:#64748b;margin-top:2px}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
      .section{margin-bottom:16px;page-break-inside:avoid}
      .section-title{font-size:12px;font-weight:bold;color:#1d4ed8;border-bottom:1px solid #e2e8f0;padding-bottom:5px;margin-bottom:8px}
      table{width:100%;border-collapse:collapse;font-size:10.5px}
      th{background:#1d4ed8;color:white;padding:6px 8px;text-align:left}
      td{padding:5px 8px;border-bottom:1px solid #f1f5f9}
      tr:nth-child(even){background:#f8fafc}
      .bar-wrap{height:14px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-top:2px}
      .bar-fill{height:100%;background:#1d4ed8;border-radius:3px}
      .footer{text-align:center;margin-top:20px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}
      @media print{@page{margin:1cm}.section{page-break-inside:avoid}}
    </style></head><body>

    <div class="header">
      <div>
        <div class="title">🐾 PashuCare ERP — Analytics Report</div>
        <div class="sub">Year: ${year} &nbsp;|&nbsp; Generated: ${today}</div>
      </div>
      <div class="print-date">Analytics & Reports<br/>PashuCare ERP System</div>
    </div>

    ${overview ? `
    <div class="section">
      <div class="section-title">📊 Overview KPIs</div>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-val">${overview.totalAnimals||0}</div><div class="kpi-lbl">Total Animals</div></div>
        <div class="kpi"><div class="kpi-val">${overview.totalAppointments||0}</div><div class="kpi-lbl">Total Appointments</div></div>
        <div class="kpi"><div class="kpi-val">${overview.completedAppointments||0}</div><div class="kpi-lbl">Completed</div></div>
        <div class="kpi"><div class="kpi-val">₹${parseFloat(overview.totalRevenue||0).toLocaleString('en-IN')}</div><div class="kpi-lbl">Total Revenue</div></div>
        <div class="kpi"><div class="kpi-val">${overview.totalBills||0}</div><div class="kpi-lbl">Total Bills</div></div>
        <div class="kpi"><div class="kpi-val">${overview.paidBills||0}</div><div class="kpi-lbl">Paid Bills</div></div>
        <div class="kpi"><div class="kpi-val">${overview.pendingBills||0}</div><div class="kpi-lbl">Pending Bills</div></div>
        <div class="kpi"><div class="kpi-val">${overview.pendingAppointments||0}</div><div class="kpi-lbl">Pending Appts</div></div>
      </div>
    </div>` : ''}

    <div class="grid2">
      ${apptData.length ? `
      <div class="section">
        <div class="section-title">📅 Appointments by Month — ${year}</div>
        <table>
          <thead><tr><th>Month</th><th>Total</th><th>Completed</th><th>Emergency</th><th>Rate</th></tr></thead>
          <tbody>
            ${apptData.map(d => {
              const rate = d.total > 0 ? Math.round(d.completed/d.total*100) : 0
              return `<tr><td>${d.name}</td><td>${d.total}</td><td>${d.completed}</td><td>${d.emergency}</td><td>${rate}%</td></tr>`
            }).join('')}
          </tbody>
        </table>
      </div>` : ''}

      ${revData.length ? `
      <div class="section">
        <div class="section-title">💰 Revenue by Month — ${year}</div>
        <table>
          <thead><tr><th>Month</th><th>Bills</th><th>Revenue (₹)</th></tr></thead>
          <tbody>
            ${revData.map(d => `<tr><td>${d.name}</td><td>${d.bills}</td><td><b>₹${parseFloat(d.revenue||0).toLocaleString('en-IN')}</b></td></tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
    </div>

    <div class="grid2">
      ${animals.length ? `
      <div class="section">
        <div class="section-title">🐾 Animal Distribution</div>
        <table>
          <thead><tr><th>Animal Type</th><th>Count</th></tr></thead>
          <tbody>${animals.map(a => `<tr><td>${a.animal_type}</td><td><b>${a.count}</b></td></tr>`).join('')}</tbody>
        </table>
      </div>` : ''}

      ${diseases.length ? `
      <div class="section">
        <div class="section-title">🦠 Top Diseases Diagnosed</div>
        <table>
          <thead><tr><th>Disease</th><th>Cases</th></tr></thead>
          <tbody>${diseases.map(d => `<tr><td>${d.disease_name}</td><td><b>${d.count}</b></td></tr>`).join('')}</tbody>
        </table>
      </div>` : ''}
    </div>

    <div class="grid2">
      ${medicines.length ? `
      <div class="section">
        <div class="section-title">💊 Top Medicine Usage</div>
        <table>
          <thead><tr><th>Medicine</th><th>Units Used</th></tr></thead>
          <tbody>
            ${medicines.map(m => `<tr><td>${m.medicine?.name||'—'}</td><td><b>${parseInt(m.dataValues?.total_used||m.total_used||0)}</b></td></tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}

      ${billing.length ? `
      <div class="section">
        <div class="section-title">🧾 Revenue by Bill Type</div>
        <table>
          <thead><tr><th>Type</th><th>Bills</th><th>Revenue (₹)</th></tr></thead>
          <tbody>${billing.map(b => `<tr><td>${b.bill_type}</td><td>${b.count}</td><td><b>₹${parseFloat(b.revenue||0).toLocaleString('en-IN')}</b></td></tr>`).join('')}</tbody>
        </table>
      </div>` : ''}
    </div>

    ${payments.length ? `
    <div class="grid2">
      <div class="section">
        <div class="section-title">💳 Payment Mode Breakdown</div>
        <table>
          <thead><tr><th>Mode</th><th>Count</th><th>Total (₹)</th></tr></thead>
          <tbody>${payments.map(p => `<tr><td>${p.payment_mode.replace('_',' ')}</td><td>${p.count}</td><td><b>₹${parseFloat(p.total||0).toLocaleString('en-IN')}</b></td></tr>`).join('')}</tbody>
        </table>
      </div>
      ${vacc ? `
      <div class="section">
        <div class="section-title">💉 Vaccination Summary</div>
        <table>
          <thead><tr><th>Vaccine</th><th>Count</th></tr></thead>
          <tbody>
            ${vacc.vaccines?.map(v => `<tr><td>${v.vaccine_name}</td><td><b>${v.count}</b></td></tr>`).join('')||''}
            <tr style="background:#fef3c7"><td><b>Due in 30 Days</b></td><td><b>${vacc.dueSoon}</b></td></tr>
            <tr style="background:#fee2e2"><td><b>Overdue</b></td><td><b>${vacc.overdue}</b></td></tr>
          </tbody>
        </table>
      </div>` : '<div></div>'}
    </div>` : ''}

    ${hospitals.length ? `
    <div class="section">
      <div class="section-title">🏥 Hospital Performance</div>
      <table>
        <thead><tr><th>Hospital</th><th>Code</th><th>Doctors</th><th>Animals</th><th>Appointments</th><th>Revenue (₹)</th></tr></thead>
        <tbody>${hospitals.map(h => `<tr><td><b>${h.name}</b></td><td>${h.code}</td><td>${h.doctors}</td><td>${h.animals}</td><td>${h.appointments}</td><td><b>₹${parseFloat(h.revenue||0).toLocaleString('en-IN')}</b></td></tr>`).join('')}</tbody>
      </table>
    </div>` : ''}

    <div class="footer">PashuCare ERP · Analytics Report · Year ${year} · Printed: ${today}</div>
    </body></html>`

    const w = window.open('', '_blank', 'width=1000,height=750')
    w.document.write(html)
    w.document.close()
    w.onload = () => setTimeout(() => { w.print(); setPrinting(false) }, 300)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const wb = XLSX.utils.book_new()

      // Sheet 1: Overview KPIs
      if (overview) {
        const ovRows = [[
          'Total Animals','Total Appointments','Completed Appointments',
          'Pending Appointments','Total Bills','Paid Bills',
          'Pending Bills','Total Revenue'
        ],[
          overview.totalAnimals, overview.totalAppointments, overview.completedAppointments,
          overview.pendingAppointments, overview.totalBills, overview.paidBills,
          overview.pendingBills, overview.totalRevenue || 0,
        ]]
        const wsOv = XLSX.utils.aoa_to_sheet(ovRows)
        wsOv['!cols'] = Array(8).fill({ wch:22 })
        XLSX.utils.book_append_sheet(wb, wsOv, 'Overview')
      }

      // Sheet 2: Appointments by Month
      if (apptData.length) {
        const apptRows = [['Month','Total','Completed','Emergency'],
          ...apptData.map(d => [d.name, d.total, d.completed, d.emergency])]
        const wsA = XLSX.utils.aoa_to_sheet(apptRows)
        wsA['!cols'] = [{ wch:10 },{ wch:10 },{ wch:12 },{ wch:12 }]
        XLSX.utils.book_append_sheet(wb, wsA, 'Appointments by Month')
      }

      // Sheet 3: Revenue by Month
      if (revData.length) {
        const revRows = [['Month','Bills','Revenue (₹)'],
          ...revData.map(d => [d.name, d.bills, d.revenue])]
        const wsR = XLSX.utils.aoa_to_sheet(revRows)
        wsR['!cols'] = [{ wch:10 },{ wch:10 },{ wch:16 }]
        XLSX.utils.book_append_sheet(wb, wsR, 'Revenue by Month')
      }

      // Sheet 4: Animal Distribution
      if (animals.length) {
        const anRows = [['Animal Type','Count'],
          ...animals.map(a => [a.animal_type, parseInt(a.count)])]
        const wsAn = XLSX.utils.aoa_to_sheet(anRows)
        wsAn['!cols'] = [{ wch:16 },{ wch:10 }]
        XLSX.utils.book_append_sheet(wb, wsAn, 'Animals by Type')
      }

      // Sheet 5: Disease Analysis
      if (diseases.length) {
        const disRows = [['Disease Name','Cases'],
          ...diseases.map(d => [d.disease_name, parseInt(d.count)])]
        const wsDis = XLSX.utils.aoa_to_sheet(disRows)
        wsDis['!cols'] = [{ wch:30 },{ wch:10 }]
        XLSX.utils.book_append_sheet(wb, wsDis, 'Disease Analysis')
      }

      // Sheet 6: Medicine Consumption
      if (medicines.length) {
        const medRows = [['Medicine','Category','Units Used'],
          ...medicines.map(m => [
            m.medicine?.name || '—',
            m.medicine?.category || '—',
            parseInt(m.dataValues?.total_used || m.total_used || 0),
          ])]
        const wsMed = XLSX.utils.aoa_to_sheet(medRows)
        wsMed['!cols'] = [{ wch:30 },{ wch:16 },{ wch:14 }]
        XLSX.utils.book_append_sheet(wb, wsMed, 'Medicine Consumption')
      }

      // Sheet 7: Revenue by Bill Type
      if (billing.length) {
        const bilRows = [['Bill Type','Count','Revenue (₹)'],
          ...billing.map(b => [b.bill_type, parseInt(b.count), parseFloat(b.revenue||0).toFixed(2)])]
        const wsBil = XLSX.utils.aoa_to_sheet(bilRows)
        wsBil['!cols'] = [{ wch:16 },{ wch:10 },{ wch:16 }]
        XLSX.utils.book_append_sheet(wb, wsBil, 'Revenue by Bill Type')
      }

      // Sheet 8: Hospital Performance
      if (hospitals.length) {
        const hospRows = [['Hospital','Code','Doctors','Animals','Appointments','Revenue (₹)'],
          ...hospitals.map(h => [h.name, h.code, h.doctors, h.animals, h.appointments, parseFloat(h.revenue||0).toFixed(2)])]
        const wsH = XLSX.utils.aoa_to_sheet(hospRows)
        wsH['!cols'] = [{ wch:30 },{ wch:16 },{ wch:10 },{ wch:10 },{ wch:15 },{ wch:16 }]
        XLSX.utils.book_append_sheet(wb, wsH, 'Hospital Performance')
      }

      // Sheet 9: Payment Breakdown
      if (payments.length) {
        const payRows = [['Payment Mode','Count','Total (₹)'],
          ...payments.map(p => [p.payment_mode, parseInt(p.count), parseFloat(p.total||0).toFixed(2)])]
        const wsPay = XLSX.utils.aoa_to_sheet(payRows)
        wsPay['!cols'] = [{ wch:18 },{ wch:10 },{ wch:16 }]
        XLSX.utils.book_append_sheet(wb, wsPay, 'Payment Breakdown')
      }

      // Sheet 10: Vaccination Summary
      if (vacc?.vaccines?.length) {
        const vaccRows = [['Vaccine Name','Count'],
          ...vacc.vaccines.map(v => [v.vaccine_name, parseInt(v.count)]),
          [],
          ['Due in 30 Days', vacc.dueSoon],
          ['Overdue', vacc.overdue],
        ]
        const wsV = XLSX.utils.aoa_to_sheet(vaccRows)
        wsV['!cols'] = [{ wch:30 },{ wch:10 }]
        XLSX.utils.book_append_sheet(wb, wsV, 'Vaccination Summary')
      }

      const date = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, 'pashucare_analytics_' + year + '_' + date + '.xlsx')
    } catch (err) {
      console.error('Export error:', err)
    } finally { setExporting(false) }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Data insights across all modules</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-base h-9 text-sm w-28">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={loadAll} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <RefreshCw size={15}/> Refresh
          </button>
          <button onClick={handlePrint} disabled={printing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors">
            <Printer size={15}/>{printing ? 'Preparing…' : 'Print Report'}
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-200 bg-green-50 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors">
            <Download size={15}/>{exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Total Animals"    value={overview?.totalAnimals}        color="blue"/>
        <StatBox label="Total Appointments" value={overview?.totalAppointments}  color="green"/>
        <StatBox label="Pending Bills"    value={overview?.pendingBills}         color="amber"/>
        <StatBox label="Total Revenue"    value={overview?.totalRevenue ? '₹'+parseFloat(overview.totalRevenue).toLocaleString('en-IN') : '₹0'} color="green"/>
      </div>

      {/* Appointments trend */}
      <SectionCard title="Appointment Trends" icon={Calendar} color="blue" loading={loading.appt}>
        {apptData.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={apptData} margin={{ top:5, right:10, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="name" tick={{ fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:11 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Legend wrapperStyle={{ fontSize:'11px' }}/>
              <Bar dataKey="total"     name="Total"     fill="#bfdbfe" radius={[4,4,0,0]}/>
              <Bar dataKey="completed" name="Completed" fill="#1d4ed8" radius={[4,4,0,0]}/>
              <Bar dataKey="emergency" name="Emergency" fill="#dc2626" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-center text-sm text-slate-400 py-8">No appointment data for {year}</p>}
      </SectionCard>

      {/* Revenue trend + Animal distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {(isAdmin || isHospital) && (
          <SectionCard title="Monthly Revenue" icon={IndianRupee} color="green" loading={loading.rev}>
            {revData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={revData} margin={{ top:5, right:10, left:-10, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="name" tick={{ fontSize:11 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => v>=1000?'₹'+(v/1000).toFixed(0)+'k':'₹'+v}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Line type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#15803d" strokeWidth={2.5} dot={{ fill:'#15803d', r:3 }}/>
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-sm text-slate-400 py-8">No revenue data for {year}</p>}
          </SectionCard>
        )}

        <SectionCard title="Animal Distribution" icon={PawPrint} color="amber" loading={loading.animals}>
          {animals.length ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={animals.map(a => ({ name: a.animal_type, value: parseInt(a.count) }))}
                    cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                    paddingAngle={2} dataKey="value">
                    {animals.map((a, i) => <Cell key={i} fill={ANIMAL_COLORS[a.animal_type]||COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v,n) => [v, n]}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {animals.map((a, i) => (
                  <div key={a.animal_type} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: ANIMAL_COLORS[a.animal_type]||COLORS[i%COLORS.length] }}/>
                      <span className="text-slate-600">{a.animal_type}</span>
                    </div>
                    <span className="font-semibold text-slate-800">{a.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-center text-sm text-slate-400 py-8">No animal data</p>}
        </SectionCard>
      </div>

      {/* Disease analysis + Medicine consumption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <SectionCard title="Top Diseases" icon={AlertTriangle} color="red" loading={loading.disease}>
          {diseases.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={diseases.map(d => ({ name: d.disease_name.length>20?d.disease_name.slice(0,18)+'…':d.disease_name, count: parseInt(d.count) }))}
                layout="vertical" margin={{ top:0, right:20, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                <XAxis type="number" tick={{ fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{ fontSize:10 }} axisLine={false} tickLine={false} width={120}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="count" name="Cases" fill="#dc2626" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-sm text-slate-400 py-8">No disease records</p>}
        </SectionCard>

        <SectionCard title="Top Medicine Usage" icon={Pill} color="purple" loading={loading.medicine}>
          {medicines.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={medicines.map(m => ({ name: m.medicine?.name?.length>18?m.medicine.name.slice(0,16)+'…':m.medicine?.name||'?', used: parseInt(m.dataValues?.total_used||m.total_used||0) }))}
                layout="vertical" margin={{ top:0, right:20, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                <XAxis type="number" tick={{ fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{ fontSize:10 }} axisLine={false} tickLine={false} width={120}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="used" name="Units Used" fill="#7c3aed" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-sm text-slate-400 py-8">No medicine usage data</p>}
        </SectionCard>
      </div>

      {/* Billing + Payment breakdown */}
      {(isAdmin || isHospital) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <SectionCard title="Revenue by Bill Type" icon={ReceiptText} color="teal" loading={loading.billing}>
            {billing.length ? (
              <div className="space-y-3">
                {billing.map((b, i) => {
                  const total = billing.reduce((s, x) => s + parseFloat(x.revenue||0), 0)
                  const pct   = total > 0 ? (parseFloat(b.revenue||0) / total * 100) : 0
                  return (
                    <div key={b.bill_type}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{b.bill_type}</span>
                        <span className="text-slate-500">₹{parseFloat(b.revenue||0).toLocaleString('en-IN')} <span className="text-xs text-slate-400">({b.count} bills)</span></span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: pct+'%', background: COLORS[i%COLORS.length] }}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : <p className="text-center text-sm text-slate-400 py-8">No billing data</p>}
          </SectionCard>

          <SectionCard title="Payment Mode Breakdown" icon={IndianRupee} color="green" loading={loading.payments}>
            {payments.length ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={payments.map(p => ({ name: p.payment_mode, value: parseFloat(p.total||0) }))}
                      cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                      paddingAngle={2} dataKey="value">
                      {payments.map((p, i) => <Cell key={i} fill={PAYMENT_COLORS[p.payment_mode]||COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={(v) => ['₹'+parseFloat(v).toLocaleString('en-IN')]}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {payments.map((p, i) => (
                    <div key={p.payment_mode} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: PAYMENT_COLORS[p.payment_mode]||COLORS[i%COLORS.length] }}/>
                        <span className="text-slate-600">{p.payment_mode.replace('_',' ')}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-center text-sm text-slate-400 py-8">No payment data</p>}
          </SectionCard>
        </div>
      )}

      {/* Hospital performance (admin only) */}
      {isAdmin && hospitals.length > 0 && (
        <SectionCard title="Hospital Performance" icon={Building2} color="blue" loading={loading.hospitals}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Hospital','Doctors','Animals','Appointments','Revenue'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hospitals.map(h => (
                  <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{h.name}</td>
                    <td className="px-4 py-3 text-slate-600">{h.doctors}</td>
                    <td className="px-4 py-3 text-slate-600">{h.animals}</td>
                    <td className="px-4 py-3 text-slate-600">{h.appointments}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">₹{parseFloat(h.revenue).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}


      {/* State / District breakdown — admin only */}
      {isAdmin && hospitals.length > 0 && (
        <SectionCard title="State-wise Hospital Distribution" icon={Building2} color="blue">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Hospital','District','Doctors','Animals','Appointments','Revenue'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hospitals.map(h => (
                  <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{h.name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{h.code}</td>
                    <td className="px-4 py-3 text-slate-600">{h.doctors}</td>
                    <td className="px-4 py-3 text-slate-600">{h.animals}</td>
                    <td className="px-4 py-3 text-slate-600">{h.appointments}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">₹{parseFloat(h.revenue).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Vaccination summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Vaccination Summary" icon={Syringe} color="teal" loading={loading.vacc}>
          {vacc ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                  <div className="text-xl font-display font-bold text-amber-700">{vacc.dueSoon}</div>
                  <div className="text-xs text-amber-600 font-medium mt-0.5">Due in 30 days</div>
                </div>
                <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                  <div className="text-xl font-display font-bold text-red-700">{vacc.overdue}</div>
                  <div className="text-xs text-red-600 font-medium mt-0.5">Overdue</div>
                </div>
              </div>
              {vacc.vaccines?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Top Vaccines</p>
                  {vacc.vaccines.slice(0,6).map((v, i) => (
                    <div key={v.vaccine_name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i%COLORS.length] }}/>
                        {v.vaccine_name}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{v.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : <p className="text-center text-sm text-slate-400 py-8">No vaccination data</p>}
        </SectionCard>

        {/* Quick stats */}
        <SectionCard title="Quick Summary" icon={TrendingUp} color="green">
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Completed Visits"  value={overview?.completedAppointments} color="green"/>
            <StatBox label="Pending Visits"    value={overview?.pendingAppointments}    color="amber"/>
            <StatBox label="Bills Paid"        value={overview?.paidBills}             color="green"/>
            <StatBox label="Bills Pending"     value={overview?.pendingBills}          color="red"/>
          </div>
        </SectionCard>
      </div>

    </div>
  )
}
