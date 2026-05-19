import {
  sendTestEmail, sendPasswordReset, sendWelcome,
  sendBillReceipt, sendAppointmentBooked,
  sendLowStockAlert, sendVaccinationReminder,
} from '../services/emailService.js'
import { Bill, BillItem, Hospital, AnimalOwner, Animal, User, Appointment } from '../models/index.js'

// ── POST /api/v1/email/test ──────────────────────────────────
export async function testEmail(req, res) {
  try {
    const to = req.body.to || req.user.email
    const result = await sendTestEmail({ to })
    if (result.success) {
      res.json({ success: true, message: `Test email sent to ${to}` })
    } else {
      res.status(500).json({ success: false, message: result.reason || result.error || 'Failed to send' })
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ── POST /api/v1/email/send-bill/:billId ─────────────────────
export async function sendBill(req, res) {
  try {
    const bill = await Bill.findByPk(req.params.billId, {
      include: [
        { model: BillItem,    as: 'items' },
        { model: Hospital,    as: 'hospital', attributes: ['name','address','phone'] },
        { model: AnimalOwner, as: 'owner',    attributes: ['name','phone'] },
      ],
    })
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' })

    const toEmail = req.body.email || bill.owner?.email
    if (!toEmail) return res.status(400).json({ success: false, message: 'No email address for this owner. Please provide an email.' })

    const result = await sendBillReceipt({
      to:        toEmail,
      ownerName: bill.owner?.name || 'Animal Owner',
      bill,
      hospital:  bill.hospital,
    })

    if (result.success) {
      res.json({ success: true, message: `Bill receipt sent to ${toEmail}` })
    } else {
      res.status(500).json({ success: false, message: result.error || 'Failed to send email' })
    }
  } catch (err) {
    console.error('Send bill email error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ── POST /api/v1/email/send-appointment/:apptId ──────────────
export async function sendAppointment(req, res) {
  try {
    const appt = await Appointment.findByPk(req.params.apptId, {
      include: [
        { model: Hospital,    as: 'hospital', attributes: ['name','address','phone'] },
        { model: User,        as: 'doctor',   attributes: ['name'], required: false },
        { model: Animal,      as: 'animal',   attributes: ['animal_type','breed','name'] },
        { model: AnimalOwner, as: 'owner',    attributes: ['name','phone'] },
      ],
    })
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' })

    const toEmail = req.body.email
    if (!toEmail) return res.status(400).json({ success: false, message: 'Please provide owner email address' })

    const result = await sendAppointmentBooked({
      to:          toEmail,
      ownerName:   appt.owner?.name || 'Animal Owner',
      appointment: appt,
      hospital:    appt.hospital,
      doctor:      appt.doctor,
      animal:      appt.animal,
    })

    if (result.success) {
      res.json({ success: true, message: `Appointment confirmation sent to ${toEmail}` })
    } else {
      res.status(500).json({ success: false, message: result.error || 'Failed to send email' })
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ── GET /api/v1/email/status ─────────────────────────────────
export async function emailStatus(req, res) {
  const configured = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
  res.json({
    success: true,
    data: {
      configured,
      gmail_user: configured ? process.env.GMAIL_USER : null,
      message: configured ? 'Gmail SMTP configured' : 'Gmail not configured — set GMAIL_USER and GMAIL_APP_PASSWORD in .env',
    },
  })
}
