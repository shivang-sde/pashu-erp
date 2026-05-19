import { Op } from 'sequelize'
import bcrypt from 'bcryptjs'
import { User, Hospital, District } from '../models/index.js'
import { sendWelcome } from '../services/emailService.js'
import { createAuditLog } from '../middleware/auditLog.js'

// ── Who can create which roles ───────────────────────────────
const CREATABLE_ROLES = {
  STATE_ADMIN:    ['DISTRICT_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'PHARMACIST', 'RECEPTIONIST'],
  DISTRICT_ADMIN: ['HOSPITAL_ADMIN', 'DOCTOR', 'PHARMACIST', 'RECEPTIONIST'],
  HOSPITAL_ADMIN: ['DOCTOR', 'PHARMACIST', 'RECEPTIONIST'],
}

const ROLE_LABELS = {
  STATE_ADMIN: 'State Admin', DISTRICT_ADMIN: 'District Admin',
  HOSPITAL_ADMIN: 'Hospital Admin', DOCTOR: 'Doctor',
  PHARMACIST: 'Pharmacist', RECEPTIONIST: 'Receptionist',
}

// ── GET /api/v1/users ────────────────────────────────────────
export async function list(req, res) {
  try {
    const { page=1, limit=10, search='', role='', status='', hospital_id='', district_id='' } = req.query

    const where = {}

    // Role visibility scoping
    if (req.user.role === 'STATE_ADMIN') {
      where.role = { [Op.in]: ['DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','PHARMACIST','RECEPTIONIST'] }
    } else if (req.user.role === 'DISTRICT_ADMIN') {
      where.role        = { [Op.in]: ['HOSPITAL_ADMIN','DOCTOR','PHARMACIST','RECEPTIONIST'] }
      where.district_id = req.user.district_id
    } else if (req.user.role === 'HOSPITAL_ADMIN') {
      where.role        = { [Op.in]: ['DOCTOR','PHARMACIST','RECEPTIONIST'] }
      where.hospital_id = req.user.hospital_id
    }

    if (role)        where.role        = role
    if (status)      where.status      = status
    if (hospital_id) where.hospital_id = hospital_id
    if (district_id) where.district_id = district_id

    if (search) {
      where[Op.or] = [
        { name:  { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ]
    }

    const offset = (parseInt(page)-1) * parseInt(limit)
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: ['id','name','email','role','status','hospital_id','district_id','last_login','created_at'],
      include: [
        { model: Hospital, as: 'hospital', attributes: ['id','name','code'], required: false },
        { model: District, as: 'district', attributes: ['id','name'],        required: false },
      ],
      order:  [['created_at','DESC']],
      limit:  parseInt(limit),
      offset,
    })

    res.json({
      success: true,
      data: {
        users: rows,
        pagination: { total:count, page:parseInt(page), limit:parseInt(limit), pages:Math.ceil(count/parseInt(limit)) },
      },
    })
  } catch (err) {
    console.error('User list error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch users' })
  }
}

// ── GET /api/v1/users/:id ────────────────────────────────────
export async function getOne(req, res) {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Hospital, as: 'hospital', attributes: ['id','name','code'], required: false },
        { model: District, as: 'district', attributes: ['id','name'],        required: false },
      ],
    })
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    res.json({ success: true, data: user })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch user' })
  }
}

// ── POST /api/v1/users ───────────────────────────────────────
export async function create(req, res) {
  try {
    const { name, email, password, role, hospital_id, district_id, status } = req.body

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password and role are required' })
    }

    // Check creator permission
    const allowed = CREATABLE_ROLES[req.user.role] || []
    if (!allowed.includes(role)) {
      return res.status(403).json({ success: false, message: `You cannot create a user with role: ${ROLE_LABELS[role]||role}` })
    }

    // Validate hospital/district requirements
    if (['HOSPITAL_ADMIN','DOCTOR','PHARMACIST','RECEPTIONIST'].includes(role) && !hospital_id) {
      return res.status(400).json({ success: false, message: 'Hospital is required for this role' })
    }
    if (role === 'DISTRICT_ADMIN' && !district_id) {
      return res.status(400).json({ success: false, message: 'District is required for District Admin' })
    }

    const existing = await User.findOne({ where: { email: email.toLowerCase().trim() } })
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' })

    // Scope district/hospital to creator if district admin
    const hId = req.user.role === 'HOSPITAL_ADMIN' ? req.user.hospital_id : (hospital_id || null)
    const dId = req.user.role === 'DISTRICT_ADMIN'  ? req.user.district_id : (district_id || null)

    const hashed = await bcrypt.hash(password, 12)
    const user = await User.create({
      name, email: email.toLowerCase().trim(),
      password: hashed, role, status: status || 'ACTIVE',
      hospital_id: hId, district_id: dId,
    })

    await createAuditLog({ userId: req.user.id, action: 'CREATE_USER', tableName: 'users', recordId: user.id, newValues: { name, email, role }, req })

    const result = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Hospital, as: 'hospital', attributes: ['id','name','code'], required: false },
        { model: District, as: 'district', attributes: ['id','name'],        required: false },
      ],
    })

    // Auto-send welcome email
    sendWelcome({
      to:       email.toLowerCase().trim(),
      name,
      role,
      password, // plain text before hashing — we saved it above
      hospital: result.hospital?.name,
    }).catch(e => console.error('Welcome email error:', e))

    res.status(201).json({ success: true, data: result, message: `${ROLE_LABELS[role]} created successfully` })
  } catch (err) {
    console.error('User create error:', err)
    res.status(500).json({ success: false, message: 'Failed to create user' })
  }
}

// ── PUT /api/v1/users/:id ────────────────────────────────────
export async function update(req, res) {
  try {
    const target = await User.findByPk(req.params.id)
    if (!target) return res.status(404).json({ success: false, message: 'User not found' })

    // Can't edit yourself or higher roles
    if (target.id === req.user.id) {
      return res.status(403).json({ success: false, message: 'Use profile settings to edit your own account' })
    }
    const allowed = CREATABLE_ROLES[req.user.role] || []
    if (!allowed.includes(target.role)) {
      return res.status(403).json({ success: false, message: 'You cannot edit this user' })
    }

    const { name, email, password, hospital_id, district_id, status } = req.body
    const old = target.toJSON()

    if (email && email.toLowerCase() !== target.email) {
      const exists = await User.findOne({ where: { email: email.toLowerCase().trim() } })
      if (exists) return res.status(409).json({ success: false, message: 'Email already in use' })
    }

    const updateData = { name, status }
    if (email)       updateData.email       = email.toLowerCase().trim()
    if (password)    updateData.password    = await bcrypt.hash(password, 12)
    if (hospital_id) updateData.hospital_id = hospital_id
    if (district_id) updateData.district_id = district_id

    await target.update(updateData)
    await createAuditLog({ userId: req.user.id, action: 'UPDATE_USER', tableName: 'users', recordId: target.id, oldValues: old, newValues: req.body, req })

    const result = await User.findByPk(target.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Hospital, as: 'hospital', attributes: ['id','name','code'], required: false },
        { model: District, as: 'district', attributes: ['id','name'],        required: false },
      ],
    })

    res.json({ success: true, data: result, message: 'User updated successfully' })
  } catch (err) {
    console.error('User update error:', err)
    res.status(500).json({ success: false, message: 'Failed to update user' })
  }
}

// ── DELETE /api/v1/users/:id ─────────────────────────────────
export async function remove(req, res) {
  try {
    const target = await User.findByPk(req.params.id)
    if (!target) return res.status(404).json({ success: false, message: 'User not found' })
    if (target.id === req.user.id) return res.status(403).json({ success: false, message: 'Cannot delete your own account' })

    const allowed = CREATABLE_ROLES[req.user.role] || []
    if (!allowed.includes(target.role)) {
      return res.status(403).json({ success: false, message: 'You cannot delete this user' })
    }

    await createAuditLog({ userId: req.user.id, action: 'DELETE_USER', tableName: 'users', recordId: target.id, oldValues: target.toJSON(), req })
    await target.destroy()
    res.json({ success: true, message: 'User deleted successfully' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete user' })
  }
}

// ── POST /api/v1/users/:id/reset-password ───────────────────
export async function resetPassword(req, res) {
  try {
    const target = await User.findByPk(req.params.id)
    if (!target) return res.status(404).json({ success: false, message: 'User not found' })

    const { new_password } = req.body
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' })
    }

    const allowed = CREATABLE_ROLES[req.user.role] || []
    if (!allowed.includes(target.role) && target.id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You cannot reset this user\'s password' })
    }

    await target.update({ password: await bcrypt.hash(new_password, 12) })
    await createAuditLog({ userId: req.user.id, action: 'RESET_PASSWORD', tableName: 'users', recordId: target.id, req })

    res.json({ success: true, message: 'Password reset successfully' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reset password' })
  }
}

// ── GET /api/v1/users/meta/form-data ────────────────────────
// Returns hospitals + districts for dropdowns
export async function getFormData(req, res) {
  try {
    const hWhere = { status: 'ACTIVE' }
    if (req.user.role === 'HOSPITAL_ADMIN') hWhere.id          = req.user.hospital_id
    if (req.user.role === 'DISTRICT_ADMIN') hWhere.district_id = req.user.district_id

    const [hospitals, districts] = await Promise.all([
      Hospital.findAll({ where: hWhere, attributes: ['id','name','code'], order: [['name','ASC']] }),
      District.findAll({ attributes: ['id','name','code'], order: [['name','ASC']] }),
    ])

    const creatableRoles = (CREATABLE_ROLES[req.user.role] || []).map(r => ({ value: r, label: ROLE_LABELS[r] }))

    res.json({ success: true, data: { hospitals, districts, creatableRoles } })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch form data' })
  }
}

// ── GET /api/v1/users/stats ──────────────────────────────────
export async function getStats(req, res) {
  try {
    const where = {}
    if (req.user.role === 'DISTRICT_ADMIN') where.district_id = req.user.district_id
    if (req.user.role === 'HOSPITAL_ADMIN') where.hospital_id = req.user.hospital_id

    const roles = ['DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','PHARMACIST','RECEPTIONIST']
    const counts = await Promise.all(roles.map(r => User.count({ where: { ...where, role:r, status:'ACTIVE' } })))

    const stats = {}
    roles.forEach((r, i) => { stats[r] = counts[i] })
    stats.total = counts.reduce((s, c) => s + c, 0)

    res.json({ success: true, data: stats })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' })
  }
}
