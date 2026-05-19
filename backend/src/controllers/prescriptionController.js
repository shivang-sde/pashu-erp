import { Op } from 'sequelize'
import {
  Prescription, PrescriptionItem, Animal, AnimalOwner,
  User, Hospital, Appointment,
} from '../models/index.js'
import { createAuditLog } from '../middleware/auditLog.js'
import { sendPrescription, sendAppointmentBooked } from '../services/emailService.js'


const INCLUDE = [
  { model: Animal,      as: 'animal',   attributes: ['id','animal_type','breed','name','ear_tag','gender','age_years','age_months'] },
  { model: AnimalOwner, as: 'owner',    attributes: ['id','name','phone','email','village'] },
  { model: User,        as: 'doctor',   attributes: ['id','name','specialization','registration_number'] },
  { model: Hospital,    as: 'hospital', attributes: ['id','name','code','phone','address'] },
  { model: PrescriptionItem, as: 'items' },
]

// ── GET /api/v1/prescriptions ────────────────────────────────
export async function list(req, res) {
  try {
    const { page=1, limit=10, animal_id='', doctor_id='', status='', date_from='', date_to='' } = req.query
    const where = {}
    if (animal_id)  where.animal_id  = animal_id
    if (status)     where.status     = status
    if (req.user.role === 'DOCTOR')         where.doctor_id   = req.user.id
    else if (doctor_id)                     where.doctor_id   = doctor_id
    if (req.user.role === 'HOSPITAL_ADMIN') where.hospital_id = req.user.hospital_id
    if (date_from && date_to) where.created_at = { [Op.gte]: new Date(date_from), [Op.lte]: new Date(date_to+'T23:59:59') }
    else if (date_from)       where.created_at = { [Op.gte]: new Date(date_from) }

    const offset = (parseInt(page)-1)*parseInt(limit)
    const { count, rows } = await Prescription.findAndCountAll({
      where, include: INCLUDE,
      order: [['created_at','DESC']],
      limit: parseInt(limit), offset,
    })
    res.json({ success:true, data:{ prescriptions:rows, pagination:{ total:count, page:parseInt(page), pages:Math.ceil(count/parseInt(limit)) } } })
  } catch (err) {
    console.error('Prescription list error:', err)
    res.status(500).json({ success:false, message:'Failed to fetch prescriptions' })
  }
}

// ── GET /api/v1/prescriptions/:id ───────────────────────────
export async function getOne(req, res) {
  try {
    const rx = await Prescription.findByPk(req.params.id, { include: INCLUDE })
    if (!rx) return res.status(404).json({ success:false, message:'Prescription not found' })
    res.json({ success:true, data:rx })
  } catch (err) {
    res.status(500).json({ success:false, message:'Failed to fetch prescription' })
  }
}

// ── POST /api/v1/prescriptions ───────────────────────────────
export async function create(req, res) {
  try {
    const {
      appointment_id, animal_id, owner_id, hospital_id,
      diagnosis, chief_complaint, notes, follow_up_date, items = [],
    } = req.body

    if (!animal_id || !owner_id) {
      return res.status(400).json({ success:false, message:'Animal and owner are required' })
    }
    if (!items.length) {
      return res.status(400).json({ success:false, message:'Add at least one medicine or instruction' })
    }

    // Resolve hospital_id — try all sources
    let hId = hospital_id              // sent from frontend (most reliable — from appointment)
      || req.user.hospital_id          // user's directly assigned hospital
      || null

    // If still null and appointment_id provided, get hospital from appointment
    if (!hId && appointment_id) {
      const appt = await Appointment.findByPk(appointment_id, { attributes: ['hospital_id'] })
      if (appt) hId = appt.hospital_id
    }

    if (!hId) {
      return res.status(400).json({ success:false, message:'Could not determine hospital. Please ensure the doctor is assigned to a hospital.' })
    }

    const rx = await Prescription.create({
      appointment_id: appointment_id || null,
      animal_id, owner_id,
      doctor_id:   req.user.id,
      hospital_id: hId,
      diagnosis, chief_complaint, notes,
      follow_up_date: follow_up_date || null,
      status: 'ACTIVE',
      email_sent: false,
    })

    // Save items
    const rxItems = items.map(i => ({
      prescription_id: rx.id,
      medicine_name:   i.medicine_name,
      medicine_id:     i.medicine_id || null,
      dosage:          i.dosage       || null,
      frequency:       i.frequency    || null,
      duration:        i.duration     || null,
      route:           i.route        || null,
      instructions:    i.instructions || null,
      quantity:        parseInt(i.quantity) || null,
    }))
    await PrescriptionItem.bulkCreate(rxItems)

    await createAuditLog({ userId:req.user.id, action:'CREATE_PRESCRIPTION', tableName:'prescriptions', recordId:rx.id, newValues:{ animal_id, diagnosis, items:items.length }, req })

    const result = await Prescription.findByPk(rx.id, { include: INCLUDE })

    // Auto-send prescription email
    const ownerEmail = result?.owner?.email
    if (ownerEmail) {
      sendPrescription({ to: ownerEmail, prescription: result })
        .then(() => rx.update({ email_sent: true }))
        .catch(err => console.error('Prescription auto-email error:', err))
    }

    // Auto-book follow-up appointment if follow_up_date provided
    if (follow_up_date && animal_id && owner_id && hId) {
      try {
        // Get token number for the day
        const apptCount = await Appointment.count({ where: { hospital_id: hId, appointment_date: follow_up_date } })
        const followUpAppt = await Appointment.create({
          animal_id,
          owner_id,
          hospital_id:      hId,
          doctor_id:        req.user.id,
          appointment_date: follow_up_date,
          type:             'ROUTINE',
          status:           'PENDING',
          token_number:     apptCount + 1,
          chief_complaint:  `Follow-up for: ${diagnosis || 'previous visit'}`,
          booked_by:        req.user.id,
        })

        // Fetch full appointment for email
        const fullAppt = await Appointment.findByPk(followUpAppt.id, {
          include: [
            { model: Hospital,    as: 'hospital', attributes: ['id','name','code','phone','address'] },
            { model: User,        as: 'doctor',   attributes: ['id','name'],  required: false },
            { model: Animal,      as: 'animal',   attributes: ['id','animal_type','breed','name'] },
            { model: AnimalOwner, as: 'owner',    attributes: ['id','name','phone','email'] },
          ],
        })

        // Send follow-up appointment confirmation email
        if (ownerEmail && fullAppt) {
          sendAppointmentBooked({
            to:          ownerEmail,
            ownerName:   result.owner?.name,
            appointment: { ...fullAppt.toJSON(), appointment_date: follow_up_date },
            hospital:    fullAppt.hospital,
            doctor:      fullAppt.doctor,
            animal:      fullAppt.animal,
          }).catch(e => console.error('Follow-up appt email error:', e))
        }

        console.log(`📅 Follow-up appointment auto-booked for ${follow_up_date}`)
      } catch (apptErr) {
        // Non-blocking — log but don't fail the prescription
        console.error('Follow-up appointment booking error:', apptErr.message)
      }
    }

    res.status(201).json({ success:true, data:result, message:'Prescription created successfully' })
  } catch (err) {
    console.error('Prescription create error:', err)
    res.status(500).json({ success:false, message:'Failed to create prescription' })
  }
}

// ── PUT /api/v1/prescriptions/:id ───────────────────────────
export async function update(req, res) {
  try {
    const rx = await Prescription.findByPk(req.params.id)
    if (!rx) return res.status(404).json({ success:false, message:'Prescription not found' })

    // Only the creating doctor or admin can edit
    if (req.user.role === 'DOCTOR' && rx.doctor_id !== req.user.id) {
      return res.status(403).json({ success:false, message:'You can only edit your own prescriptions' })
    }

    const { diagnosis, chief_complaint, notes, follow_up_date, status, items } = req.body

    await rx.update({ diagnosis, chief_complaint, notes, follow_up_date, status })

    // Replace items if provided
    if (items && items.length) {
      await PrescriptionItem.destroy({ where: { prescription_id: rx.id }, force: true })
      const rxItems = items.map(i => ({
        prescription_id: rx.id,
        medicine_name: i.medicine_name,
        medicine_id:   i.medicine_id || null,
        dosage:        i.dosage       || null,
        frequency:     i.frequency    || null,
        duration:      i.duration     || null,
        route:         i.route        || null,
        instructions:  i.instructions || null,
        quantity:      parseInt(i.quantity) || null,
      }))
      await PrescriptionItem.bulkCreate(rxItems)
    }

    const result = await Prescription.findByPk(rx.id, { include: INCLUDE })
    res.json({ success:true, data:result, message:'Prescription updated' })
  } catch (err) {
    console.error('Prescription update error:', err)
    res.status(500).json({ success:false, message:'Failed to update prescription' })
  }
}

// ── POST /api/v1/prescriptions/:id/send-email ───────────────
export async function sendEmail(req, res) {
  try {
    const rx = await Prescription.findByPk(req.params.id, { include: INCLUDE })
    if (!rx) return res.status(404).json({ success:false, message:'Prescription not found' })

    const ownerEmail = req.body.email || rx.owner?.email
    if (!ownerEmail) return res.status(400).json({ success:false, message:'No email address for this owner. Provide email in body.' })

    const result = await sendPrescription({ to: ownerEmail, prescription: rx })
    if (result.success) {
      await rx.update({ email_sent: true })
      res.json({ success:true, message:`Prescription emailed to ${ownerEmail}` })
    } else {
      res.status(500).json({ success:false, message: result.error || 'Failed to send email' })
    }
  } catch (err) {
    res.status(500).json({ success:false, message: err.message })
  }
}
