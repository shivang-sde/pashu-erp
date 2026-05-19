import { Op } from 'sequelize'
import bcrypt from 'bcryptjs'
import { User, Hospital, District, DoctorHospital } from '../models/index.js'
import { createAuditLog } from '../middleware/auditLog.js'

const DOCTOR_ATTRS = [
  'id','name','email','role',
  'specializations','specialization',   // both kept
  'registration_number',
  'hospital_id','district_id',
  'status','avatar','last_login','created_at',
]

// ── helpers ──────────────────────────────────────────────────
function parseSpecializations(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [raw] }
}

// ── GET /api/v1/doctors ─────────────────────────────────────
export async function list(req, res) {
  try {
    const { page = 1, limit = 10, search = '', status = '', hospital_id = '', specialization = '', state = '', district_id = '' } = req.query

    const where = { role: 'DOCTOR' }
    if (search) {
      where[Op.or] = [
        { name:                { [Op.like]: `%${search}%` } },
        { email:               { [Op.like]: `%${search}%` } },
        { registration_number: { [Op.like]: `%${search}%` } },
      ]
    }
    if (status)      where.status      = status
    if (district_id)  where.district_id = district_id
    if (req.user.role === 'HOSPITAL_ADMIN') where.hospital_id = req.user.hospital_id
    if (req.user.role === 'DISTRICT_ADMIN') where.district_id = req.user.district_id

    const offset = (parseInt(page) - 1) * parseInt(limit)

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: DOCTOR_ATTRS,
      include: [
        { model: District, as: 'district', attributes: ['id','name','state'], required: state ? true : false, ...(state ? { where: { state } } : {}) },
        {
          model:      Hospital,
          as:         'assignedHospitals',
          attributes: ['id','name','code'],
          through:    { attributes: ['is_primary'] },
          required:   hospital_id ? true : false,
          ...(hospital_id ? { where: { id: hospital_id } } : {}),
        },
      ],
      order:  [['created_at','DESC']],
      limit:  parseInt(limit),
      offset,
    })

    // Filter by specialization in JS (JSON column)
    let doctors = rows
    if (specialization) {
      doctors = rows.filter(d => {
        const specs = parseSpecializations(d.specializations)
        return specs.some(s => s.toLowerCase().includes(specialization.toLowerCase()))
      })
    }

    res.json({
      success: true,
      data: {
        doctors,
        pagination: {
          total: count, page: parseInt(page),
          limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)),
        },
      },
    })
  } catch (err) {
    console.error('Doctor list error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch doctors' })
  }
}

// ── GET /api/v1/doctors/:id ─────────────────────────────────
export async function getOne(req, res) {
  try {
    const doctor = await User.findOne({
      where:      { id: req.params.id, role: 'DOCTOR' },
      attributes: DOCTOR_ATTRS,
      include: [
        { model: District, as: 'district', attributes: ['id','name','state'], required: state ? true : false, ...(state ? { where: { state } } : {}) },
        { model: Hospital, as: 'assignedHospitals', attributes: ['id','name','code'], through: { attributes: ['is_primary'] }, required: false },
      ],
    })
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' })
    res.json({ success: true, data: doctor })
  } catch (err) {
    console.error('Doctor get error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch doctor' })
  }
}

// ── POST /api/v1/doctors ────────────────────────────────────
export async function create(req, res) {
  try {
    const {
      name, email, password,
      specializations = [],       // array
      registration_number,
      hospital_ids = [],           // array of hospital UUIDs
      primary_hospital_id,
      district_id, status,
    } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' })
    }
    if (!hospital_ids.length) {
      return res.status(400).json({ success: false, message: 'At least one hospital must be assigned' })
    }

    const existing = await User.scope('withPassword').findOne({ where: { email: email.toLowerCase().trim() } })
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' })

    if (registration_number) {
      const regExists = await User.findOne({ where: { registration_number, role: 'DOCTOR' } })
      if (regExists) return res.status(409).json({ success: false, message: 'Registration number already in use' })
    }

    const hashed = await bcrypt.hash(password, 12)
    const primaryId = primary_hospital_id || hospital_ids[0]

    const doctor = await User.create({
      name,
      email:               email.toLowerCase().trim(),
      password:            hashed,
      role:                'DOCTOR',
      specializations:     Array.isArray(specializations) ? specializations : [specializations],
      specialization:      Array.isArray(specializations) ? specializations[0] : specializations,
      registration_number: registration_number || null,
      hospital_id:         primaryId,
      district_id:         district_id || null,
      status:              status || 'ACTIVE',
    })

    // Create junction rows
    const junctionRows = hospital_ids.map(hid => ({
      doctor_id:   doctor.id,
      hospital_id: hid,
      is_primary:  hid === primaryId,
    }))
    await DoctorHospital.bulkCreate(junctionRows, { ignoreDuplicates: true })

    await createAuditLog({
      userId: req.user.id, action: 'CREATE_DOCTOR',
      tableName: 'users', recordId: doctor.id,
      newValues: { name, email, specializations, hospital_ids, registration_number }, req,
    })

    const result = await User.findByPk(doctor.id, {
      attributes: DOCTOR_ATTRS,
      include: [
        { model: District, as: 'district',          attributes: ['id','name'], required: false },
        { model: Hospital, as: 'assignedHospitals', attributes: ['id','name','code'], through: { attributes: ['is_primary'] }, required: false },
      ],
    })

    res.status(201).json({ success: true, data: result, message: 'Doctor created successfully' })
  } catch (err) {
    console.error('Doctor create error:', err)
    res.status(500).json({ success: false, message: 'Failed to create doctor' })
  }
}

// ── PUT /api/v1/doctors/:id ─────────────────────────────────
export async function update(req, res) {
  try {
    const doctor = await User.findOne({ where: { id: req.params.id, role: 'DOCTOR' } })
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' })

    const {
      name, email, password,
      specializations,
      registration_number,
      hospital_ids,
      primary_hospital_id,
      district_id, status,
    } = req.body

    const oldValues = doctor.toJSON()

    if (email && email.toLowerCase().trim() !== doctor.email) {
      const exists = await User.findOne({ where: { email: email.toLowerCase().trim() } })
      if (exists) return res.status(409).json({ success: false, message: 'Email already in use' })
    }

    if (registration_number && registration_number !== doctor.registration_number) {
      const regExists = await User.findOne({ where: { registration_number, role: 'DOCTOR' } })
      if (regExists) return res.status(409).json({ success: false, message: 'Registration number already in use' })
    }

    const updateData = { name, district_id, status }
    if (email)               updateData.email               = email.toLowerCase().trim()
    if (password)            updateData.password            = await bcrypt.hash(password, 12)
    if (registration_number !== undefined) updateData.registration_number = registration_number
    if (specializations) {
      updateData.specializations = Array.isArray(specializations) ? specializations : [specializations]
      updateData.specialization  = updateData.specializations[0] || null
    }

    // Update hospital assignments if provided
    if (hospital_ids?.length) {
      const primaryId = primary_hospital_id || hospital_ids[0]
      updateData.hospital_id = primaryId

      // Replace all junction rows
      await DoctorHospital.destroy({ where: { doctor_id: doctor.id } })
      const junctionRows = hospital_ids.map(hid => ({
        doctor_id:   doctor.id,
        hospital_id: hid,
        is_primary:  hid === primaryId,
      }))
      await DoctorHospital.bulkCreate(junctionRows, { ignoreDuplicates: true })
    }

    await doctor.update(updateData)

    await createAuditLog({
      userId: req.user.id, action: 'UPDATE_DOCTOR',
      tableName: 'users', recordId: doctor.id,
      oldValues, newValues: req.body, req,
    })

    const result = await User.findByPk(doctor.id, {
      attributes: DOCTOR_ATTRS,
      include: [
        { model: District, as: 'district',          attributes: ['id','name'], required: false },
        { model: Hospital, as: 'assignedHospitals', attributes: ['id','name','code'], through: { attributes: ['is_primary'] }, required: false },
      ],
    })

    res.json({ success: true, data: result, message: 'Doctor updated successfully' })
  } catch (err) {
    console.error('Doctor update error:', err)
    res.status(500).json({ success: false, message: 'Failed to update doctor' })
  }
}

// ── DELETE /api/v1/doctors/:id ──────────────────────────────
export async function remove(req, res) {
  try {
    const doctor = await User.findOne({ where: { id: req.params.id, role: 'DOCTOR' } })
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' })

    await createAuditLog({
      userId: req.user.id, action: 'DELETE_DOCTOR',
      tableName: 'users', recordId: doctor.id,
      oldValues: doctor.toJSON(), req,
    })

    await DoctorHospital.destroy({ where: { doctor_id: doctor.id } })
    await doctor.destroy()

    res.json({ success: true, message: 'Doctor deleted successfully' })
  } catch (err) {
    console.error('Doctor delete error:', err)
    res.status(500).json({ success: false, message: 'Failed to delete doctor' })
  }
}

// ── GET /api/v1/doctors/hospitals/all ──────────────────────
export async function getHospitalsForDropdown(req, res) {
  try {
    const where = { status: 'ACTIVE' }
    if (req.user.role === 'HOSPITAL_ADMIN') where.id          = req.user.hospital_id
    if (req.user.role === 'DISTRICT_ADMIN') where.district_id = req.user.district_id
    const hospitals = await Hospital.findAll({ where, attributes: ['id','name','code'], order: [['name','ASC']] })
    res.json({ success: true, data: hospitals })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch hospitals' })
  }
}

// ── GET /api/v1/doctors/specializations/all ────────────────
export async function getSpecializations(req, res) {
  try {
    // Return the full predefined list always
    const list = [
      'Large Animals','Small Animals','Equine','Poultry',
      'Bovine','Surgery','Pathology','Radiology',
      'Dermatology','Ophthalmology','Nutrition','General Practice',
      'Cardiology','Oncology','Neurology','Reproduction',
    ]
    res.json({ success: true, data: list })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch specializations' })
  }
}
