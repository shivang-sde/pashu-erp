import nodemailer from 'nodemailer'

let _transporter = null

function getTransporter() {
  if (_transporter) return _transporter
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return null
  }
  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
  return _transporter
}

function baseTemplate(title, content) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
  .wrap{max-width:580px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%);padding:28px 32px;text-align:center}
  .header-logo{font-size:28px;margin-bottom:8px}
  .header-title{color:white;font-size:20px;font-weight:bold;margin:0}
  .header-sub{color:#bfdbfe;font-size:13px;margin-top:4px}
  .body{padding:32px}
  .card{background:#f1f5f9;border-radius:12px;padding:20px;margin:20px 0}
  .card-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e2e8f0;font-size:13px}
  .card-row:last-child{border-bottom:none}
  .card-label{color:#64748b}
  .card-value{color:#1e293b;font-weight:600;text-align:right;max-width:60%}
  .btn{display:inline-block;background:#1d4ed8;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;margin:20px 0}
  .btn-green{background:#15803d}
  .alert{border-left:4px solid #dc2626;background:#fef2f2;border-radius:0 8px 8px 0;padding:14px 18px;margin:16px 0;font-size:13px}
  .alert.warn{border-color:#f59e0b;background:#fffbeb}
  .alert.ok{border-color:#15803d;background:#f0fdf4}
  .alert.info{border-color:#1d4ed8;background:#eff6ff}
  table{width:100%;border-collapse:collapse;font-size:13px;margin:12px 0}
  th{background:#1d4ed8;color:white;padding:8px 10px;text-align:left}
  td{padding:7px 10px;border-bottom:1px solid #f1f5f9}
  tr:nth-child(even) td{background:#f8fafc}
  .footer{background:#f8fafc;padding:20px 32px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0}
  .otp-box{display:inline-block;background:#1d4ed8;color:white;font-size:36px;font-weight:bold;letter-spacing:12px;padding:16px 32px;border-radius:12px}
  .badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:bold}
  .badge-green{background:#dcfce7;color:#15803d}
  .badge-amber{background:#fef3c7;color:#b45309}
  .badge-red{background:#fee2e2;color:#dc2626}
  .badge-blue{background:#dbeafe;color:#1d4ed8}
</style>
</head><body>
<div class="wrap">
  <div class="header">
    <div class="header-logo">🐾</div>
    <h1 class="header-title">PashuCare ERP</h1>
    <p class="header-sub">Veterinary Management System · Gujarat</p>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    © ${new Date().getFullYear()} PashuCare ERP · Automated email — do not reply<br/>
    ${process.env.ORG_NAME || 'Animal Husbandry Department, Gujarat'}
  </div>
</div>
</body></html>`
}

async function send({ to, subject, html }) {
  const transporter = getTransporter()
  if (!transporter) {
    console.log(`📧 [Email disabled] To:${to} | ${subject}`)
    return { success: false, reason: 'Email not configured' }
  }
  try {
    const info = await transporter.sendMail({
      from: `"PashuCare ERP" <${process.env.GMAIL_USER}>`,
      to, subject, html,
    })
    console.log(`📧 Sent → ${to}: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (err) {
    console.error(`📧 Failed → ${to}:`, err.message)
    return { success: false, error: err.message }
  }
}

// ── 1. Password Reset OTP ────────────────────────────────────
export async function sendPasswordReset({ to, name, otp }) {
  return send({ to, subject: `${otp} — PashuCare Password Reset OTP`, html: baseTemplate('Password Reset', `
    <p style="font-size:15px;color:#1e293b">Hello <strong>${name}</strong>,</p>
    <p style="font-size:14px;color:#475569">Use the OTP below to reset your PashuCare ERP password:</p>
    <div style="text-align:center;margin:28px 0">
      <div class="otp-box">${otp}</div>
      <p style="color:#94a3b8;font-size:12px;margin-top:12px">Expires in <strong>15 minutes</strong></p>
    </div>
    <div class="alert">If you did not request this, please ignore this email.</div>
  `) })
}

// ── 2. Welcome — new user account ───────────────────────────
export async function sendWelcome({ to, name, role, password, hospital }) {
  const LABELS = { STATE_ADMIN:'State Admin', DISTRICT_ADMIN:'District Admin', HOSPITAL_ADMIN:'Hospital Admin', DOCTOR:'Doctor', PHARMACIST:'Pharmacist', RECEPTIONIST:'Receptionist' }
  return send({ to, subject: 'Welcome to PashuCare ERP — Your Account is Ready', html: baseTemplate('Account Created', `
    <p style="font-size:15px;color:#1e293b">Welcome, <strong>${name}</strong>! 🎉</p>
    <p style="font-size:14px;color:#475569">Your PashuCare ERP account has been created. Here are your login details:</p>
    <div class="card">
      <div class="card-row"><span class="card-label">Email</span><span class="card-value">${to}</span></div>
      <div class="card-row"><span class="card-label">Password</span><span class="card-value">${password}</span></div>
      <div class="card-row"><span class="card-label">Role</span><span class="card-value">${LABELS[role]||role}</span></div>
      ${hospital ? `<div class="card-row"><span class="card-label">Hospital</span><span class="card-value">${hospital}</span></div>` : ''}
    </div>
    <div class="alert warn">⚠️ Please change your password after first login for security.</div>
    <div style="text-align:center">
      <a href="${process.env.FRONTEND_URL||'http://localhost:5173'}/auth/login" class="btn">Login to PashuCare →</a>
    </div>
  `) })
}

// ── 3. Doctor registered ─────────────────────────────────────
export async function sendDoctorRegistered({ to, name, registrationNumber, specializations, hospital }) {
  const specs = Array.isArray(specializations) ? specializations.join(', ') : (specializations || '—')
  return send({ to, subject: 'Doctor Registration Confirmed — PashuCare ERP', html: baseTemplate('Doctor Registered', `
    <p style="font-size:15px;color:#1e293b">Dear <strong>Dr. ${name}</strong>,</p>
    <p style="font-size:14px;color:#475569">Your profile has been successfully registered in PashuCare ERP.</p>
    <div class="card">
      <div class="card-row"><span class="card-label">Name</span><span class="card-value">Dr. ${name}</span></div>
      <div class="card-row"><span class="card-label">Registration No.</span><span class="card-value">${registrationNumber||'Pending'}</span></div>
      <div class="card-row"><span class="card-label">Specializations</span><span class="card-value">${specs}</span></div>
      <div class="card-row"><span class="card-label">Assigned Hospital</span><span class="card-value">${hospital||'To be assigned'}</span></div>
      <div class="card-row"><span class="card-label">Status</span><span class="card-value"><span class="badge badge-green">ACTIVE</span></span></div>
    </div>
    <div class="alert ok">✅ You can now log in and start managing appointments.</div>
  `) })
}

// ── 4. Hospital registered ───────────────────────────────────
export async function sendHospitalRegistered({ to, adminName, hospital }) {
  return send({ to, subject: `Hospital Registered — ${hospital.name} · PashuCare ERP`, html: baseTemplate('Hospital Registered', `
    <p style="font-size:15px;color:#1e293b">Dear <strong>${adminName}</strong>,</p>
    <p style="font-size:14px;color:#475569">The following hospital has been registered in PashuCare ERP:</p>
    <div class="card">
      <div class="card-row"><span class="card-label">Hospital Name</span><span class="card-value">${hospital.name}</span></div>
      <div class="card-row"><span class="card-label">Code</span><span class="card-value">${hospital.code}</span></div>
      <div class="card-row"><span class="card-label">Type</span><span class="card-value">${hospital.type||'—'}</span></div>
      <div class="card-row"><span class="card-label">District</span><span class="card-value">${hospital.district||'—'}</span></div>
      <div class="card-row"><span class="card-label">Address</span><span class="card-value">${hospital.address||'—'}</span></div>
      <div class="card-row"><span class="card-label">Phone</span><span class="card-value">${hospital.phone||'—'}</span></div>
      <div class="card-row"><span class="card-label">Status</span><span class="card-value"><span class="badge badge-green">ACTIVE</span></span></div>
    </div>
    <div class="alert info">🏥 Hospital is now live on PashuCare ERP. Staff can begin operations.</div>
  `) })
}

// ── 5. Animal patient registered ────────────────────────────
export async function sendAnimalRegistered({ to, ownerName, animal, hospital }) {
  const EMOJIS = { COW:'🐄', BUFFALO:'🐃', GOAT:'🐐', DOG:'🐕', CAMEL:'🐪', HORSE:'🐎', SHEEP:'🐑', OTHER:'🐾' }
  const emoji = EMOJIS[animal.animal_type] || '🐾'
  return send({ to, subject: `Animal Registered — ${emoji} ${animal.animal_type} · PashuCare ERP`, html: baseTemplate('Animal Registered', `
    <p style="font-size:15px;color:#1e293b">Dear <strong>${ownerName}</strong>,</p>
    <p style="font-size:14px;color:#475569">Your animal has been successfully registered in PashuCare ERP. Keep this for your records.</p>
    <div style="text-align:center;font-size:64px;margin:16px 0">${emoji}</div>
    <div class="card">
      <div class="card-row"><span class="card-label">Animal Type</span><span class="card-value">${animal.animal_type}</span></div>
      <div class="card-row"><span class="card-label">Breed</span><span class="card-value">${animal.breed||'—'}</span></div>
      <div class="card-row"><span class="card-label">Name</span><span class="card-value">${animal.name||'—'}</span></div>
      <div class="card-row"><span class="card-label">Gender</span><span class="card-value">${animal.gender||'—'}</span></div>
      <div class="card-row"><span class="card-label">Ear Tag</span><span class="card-value">${animal.ear_tag||'—'}</span></div>
      <div class="card-row"><span class="card-label">Hospital</span><span class="card-value">${hospital||'—'}</span></div>
    </div>
    <div class="alert ok">✅ Your animal's health records will be maintained digitally in PashuCare ERP.</div>
  `) })
}

// ── 6. Appointment booked ────────────────────────────────────
export async function sendAppointmentBooked({ to, ownerName, appointment, hospital, doctor, animal }) {
  const EMOJIS = { COW:'🐄', BUFFALO:'🐃', GOAT:'🐐', DOG:'🐕', CAMEL:'🐪', HORSE:'🐎', SHEEP:'🐑', OTHER:'🐾' }
  const isEmergency = appointment.type === 'EMERGENCY'
  return send({ to, subject: isEmergency ? '🚨 Emergency Appointment — PashuCare' : `Appointment Confirmed — Token #${appointment.token_number||'?'} · PashuCare`, html: baseTemplate('Appointment Booked', `
    <p style="font-size:15px;color:#1e293b">Dear <strong>${ownerName}</strong>,</p>
    <p style="font-size:14px;color:#475569">Your appointment has been ${isEmergency?'registered as emergency':'confirmed'} at ${hospital?.name||'PashuCare'}.</p>
    ${isEmergency
      ? '<div class="alert">🚨 <strong>Emergency appointment</strong> — please proceed to the hospital immediately.</div>'
      : `<div class="alert ok" style="text-align:center">✅ Token Number: <strong style="font-size:22px">#${appointment.token_number}</strong></div>`
    }
    <div class="card">
      <div class="card-row"><span class="card-label">Date</span><span class="card-value">${appointment.appointment_date}</span></div>
      <div class="card-row"><span class="card-label">Time</span><span class="card-value">${appointment.appointment_time||'Walk-in'}</span></div>
      <div class="card-row"><span class="card-label">Hospital</span><span class="card-value">${hospital?.name||'—'}</span></div>
      <div class="card-row"><span class="card-label">Doctor</span><span class="card-value">${doctor?'Dr. '+doctor.name:'To be assigned'}</span></div>
      <div class="card-row"><span class="card-label">Animal</span><span class="card-value">${animal?(EMOJIS[animal.animal_type]||'🐾')+' '+animal.animal_type+(animal.breed?' · '+animal.breed:'')+(animal.name?' "'+animal.name+'"':''):'—'}</span></div>
      <div class="card-row"><span class="card-label">Type</span><span class="card-value">${appointment.type}</span></div>
    </div>
    <p style="font-size:13px;color:#64748b">Please arrive 10 minutes early. Bring previous health records if available.</p>
  `) })
}

// ── 7. Bill created ──────────────────────────────────────────
export async function sendBillCreated({ to, ownerName, bill, hospital }) {
  const itemRows = bill.items?.map(i =>
    `<tr><td>${i.item_name}</td><td>${i.quantity}</td><td>₹${parseFloat(i.unit_price).toFixed(2)}</td><td>₹${parseFloat(i.amount||i.unit_price*i.quantity).toFixed(2)}</td></tr>`
  ).join('') || ''
  return send({ to, subject: `Bill Generated — ${bill.bill_number} · PashuCare`, html: baseTemplate('Bill Generated', `
    <p style="font-size:15px;color:#1e293b">Dear <strong>${ownerName}</strong>,</p>
    <p style="font-size:14px;color:#475569">A bill has been generated for your visit at ${hospital?.name||'PashuCare'}.</p>
    <div class="card">
      <div class="card-row"><span class="card-label">Bill No.</span><span class="card-value">${bill.bill_number}</span></div>
      <div class="card-row"><span class="card-label">Date</span><span class="card-value">${bill.bill_date}</span></div>
      <div class="card-row"><span class="card-label">Type</span><span class="card-value">${bill.bill_type}</span></div>
      <div class="card-row"><span class="card-label">Hospital</span><span class="card-value">${hospital?.name||'—'}</span></div>
      <div class="card-row"><span class="card-label">Status</span><span class="card-value"><span class="badge badge-amber">PENDING</span></span></div>
    </div>
    ${itemRows ? `<table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${itemRows}</tbody></table>` : ''}
    <div class="card">
      <div class="card-row"><span class="card-label">Subtotal</span><span class="card-value">₹${parseFloat(bill.subtotal||0).toFixed(2)}</span></div>
      ${parseFloat(bill.discount_amount||0)>0?`<div class="card-row"><span class="card-label">Discount</span><span class="card-value" style="color:#15803d">−₹${parseFloat(bill.discount_amount).toFixed(2)}</span></div>`:''}
      <div class="card-row"><span class="card-label" style="font-weight:bold">Total Due</span><span class="card-value" style="color:#1d4ed8;font-size:17px">₹${parseFloat(bill.total_amount||0).toFixed(2)}</span></div>
    </div>
    <div class="alert warn">💳 Please complete payment at the hospital counter. Accepted: Cash, UPI, Card.</div>
  `) })
}

// ── 8. Bill receipt (paid) ───────────────────────────────────
export async function sendBillReceipt({ to, ownerName, bill, hospital }) {
  const itemRows = bill.items?.map(i =>
    `<tr><td>${i.item_name}</td><td>${i.quantity}</td><td>₹${parseFloat(i.unit_price).toFixed(2)}</td><td>₹${parseFloat(i.amount||i.unit_price*i.quantity).toFixed(2)}</td></tr>`
  ).join('') || ''
  return send({ to, subject: `✅ Payment Receipt — ${bill.bill_number} · PashuCare`, html: baseTemplate('Payment Receipt', `
    <p style="font-size:15px;color:#1e293b">Dear <strong>${ownerName}</strong>,</p>
    <p style="font-size:14px;color:#475569">Thank you! Your payment has been received at ${hospital?.name||'PashuCare'}.</p>
    <div class="alert ok">✅ <strong>Payment Confirmed</strong> · ${bill.payment_mode?.replace('_',' ')||'Cash'}</div>
    <div class="card">
      <div class="card-row"><span class="card-label">Bill No.</span><span class="card-value">${bill.bill_number}</span></div>
      <div class="card-row"><span class="card-label">Date</span><span class="card-value">${bill.bill_date}</span></div>
      <div class="card-row"><span class="card-label">Hospital</span><span class="card-value">${hospital?.name||'—'}</span></div>
      <div class="card-row"><span class="card-label">Payment Mode</span><span class="card-value">${bill.payment_mode?.replace('_',' ')||'—'}</span></div>
      <div class="card-row"><span class="card-label">Status</span><span class="card-value"><span class="badge badge-green">PAID</span></span></div>
    </div>
    ${itemRows ? `<table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${itemRows}</tbody></table>` : ''}
    <div class="card">
      <div class="card-row"><span class="card-label" style="font-weight:bold">Amount Paid</span><span class="card-value" style="color:#15803d;font-size:18px">₹${parseFloat(bill.total_amount||0).toFixed(2)}</span></div>
    </div>
    <p style="font-size:13px;color:#64748b;text-align:center">Thank you for trusting PashuCare for your animal's healthcare. 🐾</p>
  `) })
}

// ── 9. Low stock alert ───────────────────────────────────────
export async function sendLowStockAlert({ to, name, items, hospital }) {
  const rows = items.map(i => `<tr><td>${i.name}</td><td>${i.category}</td><td style="color:#dc2626;font-weight:bold">${i.qty}</td><td>${i.min}</td></tr>`).join('')
  return send({ to, subject: `⚠️ Low Stock Alert — ${items.length} medicine${items.length>1?'s':''} need restocking`, html: baseTemplate('Low Stock Alert', `
    <p style="font-size:15px;color:#1e293b">Dear <strong>${name}</strong>,</p>
    <p style="font-size:14px;color:#475569">The following medicines at <strong>${hospital||'your hospital'}</strong> are below minimum stock levels:</p>
    <div class="alert">⚠️ <strong>${items.length} medicine${items.length>1?'s':''} need immediate restocking</strong></div>
    <table><thead><tr><th>Medicine</th><th>Category</th><th>Current</th><th>Minimum</th></tr></thead><tbody>${rows}</tbody></table>
    <p style="font-size:13px;color:#64748b;margin-top:16px">Please arrange restocking immediately to avoid treatment delays.</p>
  `) })
}

// ── 10. Vaccination reminder ─────────────────────────────────
export async function sendVaccinationReminder({ to, ownerName, vaccinations }) {
  const rows = vaccinations.map(v => `<tr><td>${v.vaccine_name}</td><td>${v.animal_type}${v.animal_name?' "'+v.animal_name+'"':''}</td><td style="color:#dc2626;font-weight:bold">${v.next_due_at}</td></tr>`).join('')
  return send({ to, subject: `💉 Vaccination Reminder — ${vaccinations.length} due`, html: baseTemplate('Vaccination Reminder', `
    <p style="font-size:15px;color:#1e293b">Dear <strong>${ownerName}</strong>,</p>
    <p style="font-size:14px;color:#475569">The following vaccinations for your animals are due or overdue:</p>
    <div class="alert warn">💉 <strong>${vaccinations.length} vaccination${vaccinations.length>1?'s':''} require attention</strong></div>
    <table><thead><tr><th>Vaccine</th><th>Animal</th><th>Due Date</th></tr></thead><tbody>${rows}</tbody></table>
    <p style="font-size:13px;color:#64748b;margin-top:16px">Please visit your nearest PashuCare hospital at the earliest.</p>
  `) })
}


// ── 12. Prescription ─────────────────────────────────────────
export async function sendPrescription({ to, prescription }) {
  const rx = prescription
  const EMOJIS = { COW:'🐄',BUFFALO:'🐃',GOAT:'🐐',DOG:'🐕',CAMEL:'🐪',HORSE:'🐎',SHEEP:'🐑',OTHER:'🐾' }
  const emoji = EMOJIS[rx.animal?.animal_type] || '🐾'

  const itemRows = rx.items?.map(i => `
    <tr>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;font-weight:600">${i.medicine_name}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9">${i.dosage||'—'}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9">${i.frequency||'—'}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9">${i.duration||'—'}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9">${i.route||'—'}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#64748b">${i.instructions||'—'}</td>
    </tr>`).join('') || ''

  const html = baseTemplate('Prescription', `
    <p style="font-size:15px;color:#1e293b">Dear <strong>${rx.owner?.name}</strong>,</p>
    <p style="font-size:14px;color:#475569">Dr. <strong>${rx.doctor?.name}</strong> has issued a prescription for your animal at <strong>${rx.hospital?.name}</strong>.</p>
    <div class="card">
      <div class="card-row"><span class="card-label">Date</span><span class="card-value">${new Date(rx.createdAt||rx.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</span></div>
      <div class="card-row"><span class="card-label">Animal</span><span class="card-value">${emoji} ${rx.animal?.animal_type}${rx.animal?.breed?' · '+rx.animal.breed:''}${rx.animal?.name?' "'+rx.animal.name+'"':''}</span></div>
      <div class="card-row"><span class="card-label">Doctor</span><span class="card-value">Dr. ${rx.doctor?.name}</span></div>
      <div class="card-row"><span class="card-label">Hospital</span><span class="card-value">${rx.hospital?.name}</span></div>
      ${rx.chief_complaint?`<div class="card-row"><span class="card-label">Chief Complaint</span><span class="card-value">${rx.chief_complaint}</span></div>`:''}
      ${rx.diagnosis?`<div class="card-row"><span class="card-label">Diagnosis</span><span class="card-value">${rx.diagnosis}</span></div>`:''}
      ${rx.follow_up_date?`<div class="card-row"><span class="card-label">Follow-up Date</span><span class="card-value" style="color:#dc2626;font-weight:bold">${rx.follow_up_date}</span></div>`:''}
    </div>
    <p style="font-size:13px;font-weight:bold;color:#1e293b;margin:16px 0 8px">💊 Medicines Prescribed</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:#1d4ed8;color:white">
        <th style="padding:8px 10px;text-align:left">Medicine</th>
        <th style="padding:8px 10px;text-align:left">Dosage</th>
        <th style="padding:8px 10px;text-align:left">Frequency</th>
        <th style="padding:8px 10px;text-align:left">Duration</th>
        <th style="padding:8px 10px;text-align:left">Route</th>
        <th style="padding:8px 10px;text-align:left">Instructions</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    ${rx.notes?`<div class="alert info" style="margin-top:16px"><strong>📝 Notes:</strong> ${rx.notes}</div>`:''}
    <p style="font-size:12px;color:#94a3b8;margin-top:20px;text-align:center">
      For queries contact ${rx.hospital?.name}${rx.hospital?.phone?' at '+rx.hospital.phone:''}.
    </p>
  `)
  return send({ to, subject: `Prescription from Dr. ${rx.doctor?.name} — PashuCare`, html })
}
// ── 11. Test email ───────────────────────────────────────────
export async function sendTestEmail({ to }) {
  return send({ to, subject: '✅ PashuCare ERP — Email Test Successful', html: baseTemplate('Email Test', `
    <p style="font-size:15px;color:#1e293b">Hello!</p>
    <p style="font-size:14px;color:#475569">Your Gmail integration is working correctly! ✅</p>
    <div class="alert ok">✅ Email configuration successful!<br/>Sent at: ${new Date().toLocaleString('en-IN')}</div>
  `) })
}
