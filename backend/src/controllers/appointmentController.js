import { Op, fn, col, literal, Sequelize } from 'sequelize'
import { Appointment, Animal, AnimalOwner, Hospital, User } from '../models/index.js'
import { createAuditLog } from '../middleware/auditLog.js'

const APPT_INCLUDE = [
  { model: Animal,      as: 'animal',   attributes: ['id','animal_type','breed','name','ear_tag'] },
  { model: AnimalOwner, as: 'owner',    attributes: ['id','name','phone','village'] },
  { model: Hospital,    as: 'hospital', attributes: ['id','name','code'] },
  { model: User,        as: 'doctor',   attributes: ['id','name','specializations'], required: false },
  { model: User,        as: 'bookedBy', attributes: ['id','name','role'],            required: false },
]

// ── helper: next token for hospital + date ──────────────────
async function getNextToken(hospital_id, date) {
  const last = await Appointment.findOne({
    where:  { hospital_id, appointment_date: date, type: { [Op.ne]: 'EMERGENCY' } },
    order:  [['token_number','DESC']],
    attributes: ['token_number'],
  })
  return (last?.token_number || 0) + 1
}

// ── GET /api/v1/appointments ────────────────────────────────
export async function list(req, res) {
  try {
    const {
      page=1, limit=10, date='', status='', type='',
      hospital_id='', doctor_id='', search='',
    } = req.query

    const where = {}
    if (status)   where.status      = status
    if (type)     where.type        = type
    if (date)     where.appointment_date = date
    if (doctor_id)where.doctor_id   = doctor_id

    if (req.user.role === 'HOSPITAL_ADMIN') where.hospital_id = req.user.hospital_id
    else if (req.user.role === 'DOCTOR')    where.doctor_id   = req.user.id
    else if (hospital_id)                   where.hospital_id = hospital_id

    const offset = (parseInt(page)-1) * parseInt(limit)

    const { count, rows } = await Appointment.findAndCountAll({
      where,
      include: [
        { model: Animal,      as: 'animal',   attributes: ['id','animal_type','breed','name','ear_tag'],
          ...(search ? { where: { [Op.or]: [{ name:{[Op.like]:`%${search}%`} }, { breed:{[Op.like]:`%${search}%`} }, { ear_tag:{[Op.like]:`%${search}%`} }] }, required: false } : {}) },
        { model: AnimalOwner, as: 'owner',    attributes: ['id','name','phone'],
          ...(search ? { where: { [Op.or]: [{ name:{[Op.like]:`%${search}%`} }, { phone:{[Op.like]:`%${search}%`} }] }, required: false } : {}) },
        { model: Hospital,    as: 'hospital', attributes: ['id','name','code'] },
        { model: User,        as: 'doctor',   attributes: ['id','name'], required: false },
        { model: User,        as: 'bookedBy', attributes: ['id','name'], required: false },
      ],
      order: [
        ['appointment_date','DESC'],
        ['token_number','ASC'],
      ],
      limit:    parseInt(limit),
      offset,
      distinct: true,
    })

    res.json({
      success: true,
      data: {
        appointments: rows,
        pagination: { total:count, page:parseInt(page), limit:parseInt(limit), pages:Math.ceil(count/parseInt(limit)) },
      },
    })
  } catch (err) {
    console.error('Appointment list error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch appointments' })
  }
}

// ── GET /api/v1/appointments/today ─────────────────────────
export async function today(req, res) {
  try {
    const todayDate = new Date().toISOString().split('T')[0]
    const where = { appointment_date: todayDate }
    if (req.user.role === 'HOSPITAL_ADMIN') where.hospital_id = req.user.hospital_id
    if (req.user.role === 'DOCTOR')         where.doctor_id   = req.user.id

    const rows = await Appointment.findAll({
      where,
      include: APPT_INCLUDE,
      order: [
        ['type','ASC'],
        ['token_number','ASC'],
      ],
    })
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('Today appointments error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch today appointments' })
  }
}

// ── GET /api/v1/appointments/stats ─────────────────────────
export async function stats(req, res) {
  try {
    const todayDate = new Date().toISOString().split('T')[0]
    const where = {}
    if (req.user.role === 'HOSPITAL_ADMIN') where.hospital_id = req.user.hospital_id
    if (req.user.role === 'DOCTOR')         where.doctor_id   = req.user.id

    const [total, todayTotal, pending, completed, emergency] = await Promise.all([
      Appointment.count({ where }),
      Appointment.count({ where: { ...where, appointment_date: todayDate } }),
      Appointment.count({ where: { ...where, status: 'PENDING' } }),
      Appointment.count({ where: { ...where, status: 'COMPLETED' } }),
      Appointment.count({ where: { ...where, type: 'EMERGENCY', appointment_date: todayDate } }),
    ])

    res.json({ success: true, data: { total, todayTotal, pending, completed, emergency } })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' })
  }
}

// ── GET /api/v1/appointments/:id ────────────────────────────
export async function getOne(req, res) {
  try {
    const appt = await Appointment.findByPk(req.params.id, { include: APPT_INCLUDE })
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' })
    res.json({ success: true, data: appt })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch appointment' })
  }
}

// ── POST /api/v1/appointments ───────────────────────────────
export async function create(req, res) {
  try {
    const {
      animal_id, hospital_id, doctor_id,
      appointment_date, appointment_time,
      type, chief_complaint, notes,
    } = req.body

    if (!animal_id || !hospital_id || !appointment_date) {
      return res.status(400).json({ success: false, message: 'Animal, hospital and date are required' })
    }

    const animal = await Animal.findByPk(animal_id, { attributes: ['id','owner_id'] })
    if (!animal) return res.status(404).json({ success: false, message: 'Animal not found' })

    const apptType = type || 'REGULAR'

    // Token: emergency = null (priority queue), regular = next number
    const token = apptType === 'EMERGENCY' ? null : await getNextToken(hospital_id, appointment_date)

    const appt = await Appointment.create({
      animal_id,
      owner_id:         animal.owner_id,
      hospital_id,
      doctor_id:        doctor_id || null,
      appointment_date,
      appointment_time: appointment_time || null,
      type:             apptType,
      status:           'PENDING',
      chief_complaint:  chief_complaint || null,
      notes:            notes || null,
      token_number:     token,
      booked_by:        req.user.id,
    })

    await createAuditLog({ userId: req.user.id, action: 'CREATE_APPOINTMENT', tableName: 'appointments', recordId: appt.id, newValues: req.body, req })

    const result = await Appointment.findByPk(appt.id, { include: APPT_INCLUDE })
    // Auto-send booking confirmation
    try {
      const ownerEmail = result.owner?.email
      if (ownerEmail) {
        sendAppointmentBooked({
          to:          ownerEmail,
          ownerName:   result.owner?.name,
          appointment: result,
          hospital:    result.hospital,
          doctor:      result.doctor,
          animal:      result.animal,
        }).catch(e => console.error('Appointment email error:', e))
      }
    } catch {}

    res.status(201).json({ success: true, data: result, message: 'Appointment booked successfully' })
  } catch (err) {
    console.error('Appointment create error:', err)
    res.status(500).json({ success: false, message: 'Failed to book appointment' })
  }
}

// ── PUT /api/v1/appointments/:id ────────────────────────────
export async function update(req, res) {
  try {
    const appt = await Appointment.findByPk(req.params.id)
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' })

    const { doctor_id, appointment_time, status, notes, chief_complaint } = req.body
    const old = appt.toJSON()

    await appt.update({ doctor_id, appointment_time, status, notes, chief_complaint })

    await createAuditLog({ userId: req.user.id, action: 'UPDATE_APPOINTMENT', tableName: 'appointments', recordId: appt.id, oldValues: old, newValues: req.body, req })

    const result = await Appointment.findByPk(appt.id, { include: APPT_INCLUDE })
    res.json({ success: true, data: result, message: 'Appointment updated' })
  } catch (err) {
    console.error('Appointment update error:', err)
    res.status(500).json({ success: false, message: 'Failed to update appointment' })
  }
}

// ── PATCH /api/v1/appointments/:id/status ──────────────────
export async function updateStatus(req, res) {
  try {
    const appt = await Appointment.findByPk(req.params.id)
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' })

    const { status, cancel_reason } = req.body
    const VALID = ['PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW']
    if (!VALID.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' })

    const updateData = { status }
    if (status === 'CANCELLED') {
      updateData.cancelled_by  = req.user.id
      updateData.cancel_reason = cancel_reason || null
    }

    await appt.update(updateData)
    await createAuditLog({ userId: req.user.id, action: 'UPDATE_APPOINTMENT_STATUS', tableName: 'appointments', recordId: appt.id, oldValues: { status: appt.status }, newValues: { status }, req })

    const result = await Appointment.findByPk(appt.id, { include: APPT_INCLUDE })
    res.json({ success: true, data: result, message: `Appointment ${status.toLowerCase()}` })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update status' })
  }
}

// ── PATCH /api/v1/appointments/:id/assign-doctor ───────────
export async function assignDoctor(req, res) {
  try {
    const appt = await Appointment.findByPk(req.params.id)
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' })

    const { doctor_id } = req.body
    if (!doctor_id) return res.status(400).json({ success: false, message: 'doctor_id is required' })

    await appt.update({ doctor_id, status: 'CONFIRMED' })
    const result = await Appointment.findByPk(appt.id, { include: APPT_INCLUDE })
    res.json({ success: true, data: result, message: 'Doctor assigned successfully' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to assign doctor' })
  }
}

// ── DELETE /api/v1/appointments/:id ────────────────────────
export async function remove(req, res) {
  try {
    const appt = await Appointment.findByPk(req.params.id)
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' })
    await createAuditLog({ userId: req.user.id, action: 'DELETE_APPOINTMENT', tableName: 'appointments', recordId: appt.id, oldValues: appt.toJSON(), req })
    await appt.destroy()
    res.json({ success: true, message: 'Appointment deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete appointment' })
  }
}

// ── GET /api/v1/appointments/doctors/available ─────────────
export async function getAvailableDoctors(req, res) {
  try {
    const { hospital_id } = req.query
    const where = { role: 'DOCTOR', status: 'ACTIVE' }
    if (hospital_id) where.hospital_id = hospital_id

    const doctors = await User.findAll({
      where,
      attributes: ['id','name','specializations','specialization'],
      order: [['name','ASC']],
    })
    res.json({ success: true, data: doctors })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch doctors' })
  }
}
