import { Op, fn, col } from 'sequelize'
import { Hospital, District, User } from '../models/index.js'
import { createAuditLog } from '../middleware/auditLog.js'

// ── GET /api/v1/hospitals ───────────────────────────────────
export async function list(req, res) {
  try {
    const { page = 1, limit = 10, search = '', status = '', type = '', district_id = '' } = req.query

    const where = {}
    if (search) {
      where[Op.or] = [
        { name:    { [Op.like]: `%${search}%` } },
        { code:    { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } },
        { phone:   { [Op.like]: `%${search}%` } },
      ]
    }
    if (status)      where.status      = status
    if (type)        where.type        = type
    if (district_id) where.district_id = district_id

    // Role-based scoping
    if (req.user.role === 'HOSPITAL_ADMIN') {
      where.id = req.user.hospital_id
    } else if (req.user.role === 'DISTRICT_ADMIN') {
      where.district_id = req.user.district_id
    }

    const offset = (parseInt(page) - 1) * parseInt(limit)

    const { count, rows } = await Hospital.findAndCountAll({
      where,
      include: [{ model: District, as: 'district', attributes: ['id', 'name', 'code'] }],
      order:   [['created_at', 'DESC']],
      limit:   parseInt(limit),
      offset,
    })

    // Staff count per hospital
    const ids = rows.map(h => h.id)
    const staffCounts = ids.length ? await User.findAll({
      where:      { hospital_id: { [Op.in]: ids }, status: 'ACTIVE' },
      attributes: ['hospital_id', [fn('COUNT', col('id')), 'count']],
      group:      ['hospital_id'],
      raw:        true,
    }) : []
    const staffMap = {}
    staffCounts.forEach(s => { staffMap[s.hospital_id] = parseInt(s.count) })

    const hospitals = rows.map(h => ({
      ...h.toJSON(),
      staffCount: staffMap[h.id] || 0,
    }))

    res.json({
      success: true,
      data: {
        hospitals,
        pagination: {
          total:  count,
          page:   parseInt(page),
          limit:  parseInt(limit),
          pages:  Math.ceil(count / parseInt(limit)),
        },
      },
    })
  } catch (err) {
    console.error('Hospital list error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch hospitals' })
  }
}

// ── GET /api/v1/hospitals/:id ───────────────────────────────
export async function getOne(req, res) {
  try {
    const hospital = await Hospital.findByPk(req.params.id, {
      include: [
        { model: District, as: 'district', attributes: ['id', 'name', 'code'] },
        { model: User,     as: 'staff',    attributes: ['id', 'name', 'role', 'email', 'status'], required: false },
      ],
    })
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' })
    res.json({ success: true, data: hospital })
  } catch (err) {
    console.error('Hospital get error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch hospital' })
  }
}

// ── POST /api/v1/hospitals ──────────────────────────────────
export async function create(req, res) {
  try {
    const { name, code, address, phone, email, district_id, type, status } = req.body

    if (!name || !code || !district_id) {
      return res.status(400).json({ success: false, message: 'Name, code and district are required' })
    }

    // Check unique code
    const existing = await Hospital.findOne({ where: { code } })
    if (existing) return res.status(409).json({ success: false, message: `Hospital code "${code}" already exists` })

    // Check district exists
    const district = await District.findByPk(district_id)
    if (!district) return res.status(400).json({ success: false, message: 'District not found' })

    const hospital = await Hospital.create({ name, code, address, phone, email, district_id, type, status })

    await createAuditLog({
      userId: req.user.id, action: 'CREATE_HOSPITAL',
      tableName: 'hospitals', recordId: hospital.id,
      newValues: { name, code, district_id }, req,
    })

    const result = await Hospital.findByPk(hospital.id, {
      include: [{ model: District, as: 'district', attributes: ['id', 'name', 'code'] }],
    })

    res.status(201).json({ success: true, data: result, message: 'Hospital created successfully' })
  } catch (err) {
    console.error('Hospital create error:', err)
    res.status(500).json({ success: false, message: 'Failed to create hospital' })
  }
}

// ── PUT /api/v1/hospitals/:id ───────────────────────────────
export async function update(req, res) {
  try {
    const hospital = await Hospital.findByPk(req.params.id)
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' })

    const { name, code, address, phone, email, district_id, type, status } = req.body
    const oldValues = hospital.toJSON()

    // Check code uniqueness if changed
    if (code && code !== hospital.code) {
      const existing = await Hospital.findOne({ where: { code } })
      if (existing) return res.status(409).json({ success: false, message: `Hospital code "${code}" already exists` })
    }

    await hospital.update({ name, code, address, phone, email, district_id, type, status })

    await createAuditLog({
      userId: req.user.id, action: 'UPDATE_HOSPITAL',
      tableName: 'hospitals', recordId: hospital.id,
      oldValues, newValues: req.body, req,
    })

    const result = await Hospital.findByPk(hospital.id, {
      include: [{ model: District, as: 'district', attributes: ['id', 'name', 'code'] }],
    })

    res.json({ success: true, data: result, message: 'Hospital updated successfully' })
  } catch (err) {
    console.error('Hospital update error:', err)
    res.status(500).json({ success: false, message: 'Failed to update hospital' })
  }
}

// ── DELETE /api/v1/hospitals/:id ────────────────────────────
export async function remove(req, res) {
  try {
    const hospital = await Hospital.findByPk(req.params.id)
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' })

    // Check if any active staff assigned
    const staffCount = await User.count({ where: { hospital_id: hospital.id, status: 'ACTIVE' } })
    if (staffCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete — ${staffCount} active staff member(s) are assigned to this hospital`,
      })
    }

    await createAuditLog({
      userId: req.user.id, action: 'DELETE_HOSPITAL',
      tableName: 'hospitals', recordId: hospital.id,
      oldValues: hospital.toJSON(), req,
    })

    await hospital.destroy() // soft delete (paranoid)

    res.json({ success: true, message: 'Hospital deleted successfully' })
  } catch (err) {
    console.error('Hospital delete error:', err)
    res.status(500).json({ success: false, message: 'Failed to delete hospital' })
  }
}

// ── GET /api/v1/hospitals/districts/all ────────────────────
export async function getAllDistricts(req, res) {
  try {
    const districts = await District.findAll({ order: [['name', 'ASC']] })
    res.json({ success: true, data: districts })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch districts' })
  }
}
