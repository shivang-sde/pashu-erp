import { Op, fn, col, literal } from 'sequelize'
import { User, Hospital, District, AuditLog } from '../models/index.js'
import sequelize from '../config/database.js'

// ── GET /api/v1/dashboard/stats ─────────────────────────────
// Returns top-level KPI counts for State Admin dashboard
export async function getStats(req, res) {
  try {
    const [
      totalHospitals,
      totalDoctors,
      totalUsers,
      totalDistricts,
      activeHospitals,
    ] = await Promise.all([
      Hospital.count(),
      User.count({ where: { role: 'DOCTOR', status: 'ACTIVE' } }),
      User.count({ where: { status: 'ACTIVE' } }),
      District.count(),
      Hospital.count({ where: { status: 'ACTIVE' } }),
    ])

    res.json({
      success: true,
      data: {
        totalHospitals,
        activeHospitals,
        totalDoctors,
        totalUsers,
        totalDistricts,
        // Placeholder counts for modules not yet built
        totalPatients:    0,
        totalMedicines:   0,
        pendingAppointments: 0,
      },
    })
  } catch (err) {
    console.error('Stats error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch stats' })
  }
}

// ── GET /api/v1/dashboard/hospitals ────────────────────────
// Returns hospital list with district info
export async function getHospitals(req, res) {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query

    const where = {}
    if (search) {
      where[Op.or] = [
        { name:    { [Op.like]: `%${search}%` } },
        { code:    { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } },
      ]
    }
    if (status) where.status = status

    const offset = (parseInt(page) - 1) * parseInt(limit)

    const { count, rows } = await Hospital.findAndCountAll({
      where,
      include: [{ association: 'district', attributes: ['id', 'name', 'code'] }],
      order:   [['created_at', 'DESC']],
      limit:   parseInt(limit),
      offset,
    })

    // Staff count per hospital
    const hospitalIds = rows.map(h => h.id)
    const staffCounts = await User.findAll({
      where:      { hospital_id: { [Op.in]: hospitalIds }, status: 'ACTIVE' },
      attributes: ['hospital_id', [fn('COUNT', col('id')), 'count']],
      group:      ['hospital_id'],
      raw:        true,
    })
    const staffMap = {}
    staffCounts.forEach(s => { staffMap[s.hospital_id] = parseInt(s.count) })

    const hospitals = rows.map(h => ({
      id:          h.id,
      name:        h.name,
      code:        h.code,
      address:     h.address,
      phone:       h.phone,
      email:       h.email,
      type:        h.type,
      status:      h.status,
      district:    h.district,
      staffCount:  staffMap[h.id] || 0,
      createdAt:   h.created_at,
    }))

    res.json({
      success: true,
      data: {
        hospitals,
        pagination: {
          total: count,
          page:  parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit)),
        },
      },
    })
  } catch (err) {
    console.error('Hospitals error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch hospitals' })
  }
}

// ── GET /api/v1/dashboard/user-roles ───────────────────────
// Role-wise user count for chart
export async function getUserRoles(req, res) {
  try {
    const counts = await User.findAll({
      attributes: ['role', [fn('COUNT', col('id')), 'count']],
      where:      { status: 'ACTIVE' },
      group:      ['role'],
      raw:        true,
    })
    res.json({ success: true, data: counts })
  } catch (err) {
    console.error('User roles error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch user roles' })
  }
}

// ── GET /api/v1/dashboard/district-summary ──────────────────
export async function getDistrictSummary(req, res) {
  try {
    const { state } = req.query

    const districtWhere = state ? { state } : {}

    const districts = await District.findAll({
      where: districtWhere,
      attributes: ['id','name','state','code'],
      include: [
        { association: 'hospitals', attributes: ['id','status'], required: false },
        { association: 'users', attributes: ['id','role'],
          where: { role: 'DOCTOR', status: 'ACTIVE' }, required: false },
      ],
      order: [['state','ASC'],['name','ASC']],
    })

    const data = districts
      .map(d => ({
        id:              d.id,
        name:            d.name,
        state:           d.state,
        code:            d.code,
        hospitals:       d.hospitals?.length || 0,
        activeHospitals: d.hospitals?.filter(h => h.status === 'ACTIVE').length || 0,
        doctors:         d.users?.length || 0,
      }))
      .filter(d => d.hospitals > 0)  // only show districts with at least 1 hospital

    // Group by state for state-level summary
    const byState = {}
    data.forEach(d => {
      if (!byState[d.state]) byState[d.state] = { state:d.state, districts:0, hospitals:0, doctors:0 }
      byState[d.state].districts++
      byState[d.state].hospitals += d.hospitals
      byState[d.state].doctors   += d.doctors
    })

    const uniqueStates = [...new Set(districts.map(d => d.state).filter(Boolean))].sort()

    res.json({ success: true, data, byState: Object.values(byState), states: uniqueStates })
  } catch (err) {
    console.error('District summary error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch district summary' })
  }
}

// ── GET /api/v1/dashboard/recent-activity ──────────────────
// Last 10 audit log entries
export async function getRecentActivity(req, res) {
  try {
    const logs = await AuditLog.findAll({
      order:   [['created_at', 'DESC']],
      limit:   10,
      include: [{ association: 'user', attributes: ['name', 'role'] }],
    })
    res.json({ success: true, data: logs })
  } catch (err) {
    console.error('Recent activity error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch activity' })
  }
}
