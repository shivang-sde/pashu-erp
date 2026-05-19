import { Op, fn, col, literal } from 'sequelize'
import sequelize from '../config/database.js'
import {
  Animal, AnimalOwner, Appointment, Bill, BillItem,
  Hospital, District, User, Medicine, MedicineBatch,
  StockMovement, DiseaseHistory, VaccinationRecord,
} from '../models/index.js'

function hospitalScope(user, alias = '') {
  const prefix = alias ? alias + '.' : ''
  if (user.role === 'HOSPITAL_ADMIN') return { [`${prefix}hospital_id`]: user.hospital_id }
  if (user.role === 'DISTRICT_ADMIN') return { [`${prefix}district_id`]: user.district_id }
  return {}
}

// ── GET /api/v1/reports/overview ────────────────────────────
export async function overview(req, res) {
  try {
    const { date_from, date_to } = req.query
    const hWhere = user => user.role === 'HOSPITAL_ADMIN' ? { hospital_id: user.hospital_id } : {}
    const dateRange = {}
    if (date_from) dateRange[Op.gte] = date_from
    if (date_to)   dateRange[Op.lte] = date_to

    const apptWhere = { ...(Object.keys(dateRange).length ? { appointment_date: dateRange } : {}), ...hWhere(req.user) }
    const billWhere = { ...(Object.keys(dateRange).length ? { bill_date: dateRange } : {}), ...hWhere(req.user) }

    const [
      totalAnimals, totalAppointments, totalBills,
      completedAppointments, paidBills, totalRevenue,
      pendingAppointments, pendingBills,
    ] = await Promise.all([
      Animal.count({ where: hWhere(req.user) }),
      Appointment.count({ where: apptWhere }),
      Bill.count({ where: billWhere }),
      Appointment.count({ where: { ...apptWhere, status: 'COMPLETED' } }),
      Bill.count({ where: { ...billWhere, status: 'PAID' } }),
      Bill.sum('total_amount', { where: { ...billWhere, status: 'PAID' } }),
      Appointment.count({ where: { ...apptWhere, status: 'PENDING' } }),
      Bill.count({ where: { ...billWhere, status: 'PENDING' } }),
    ])

    res.json({
      success: true,
      data: {
        totalAnimals, totalAppointments, totalBills,
        completedAppointments, paidBills,
        totalRevenue: totalRevenue || 0,
        pendingAppointments, pendingBills,
      },
    })
  } catch (err) {
    console.error('Overview error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch overview' })
  }
}

// ── GET /api/v1/reports/appointments-by-month ───────────────
export async function appointmentsByMonth(req, res) {
  try {
    const year  = req.query.year || new Date().getFullYear()
    const where = { ...(req.user.role === 'HOSPITAL_ADMIN' ? { hospital_id: req.user.hospital_id } : {}) }

    const rows = await Appointment.findAll({
      where: {
        ...where,
        appointment_date: {
          [Op.gte]: `${year}-01-01`,
          [Op.lte]: `${year}-12-31`,
        },
      },
      attributes: [
        [fn('MONTH', col('appointment_date')), 'month'],
        [fn('COUNT', col('id')), 'total'],
        [fn('SUM', literal("CASE WHEN status='COMPLETED' THEN 1 ELSE 0 END")), 'completed'],
        [fn('SUM', literal("CASE WHEN type='EMERGENCY' THEN 1 ELSE 0 END")), 'emergency'],
      ],
      group: [fn('MONTH', col('appointment_date'))],
      order: [[fn('MONTH', col('appointment_date')), 'ASC']],
      raw: true,
    })

    // Fill all 12 months
    const months = Array.from({ length: 12 }, (_, i) => {
      const found = rows.find(r => parseInt(r.month) === i + 1)
      return { month: i + 1, total: parseInt(found?.total||0), completed: parseInt(found?.completed||0), emergency: parseInt(found?.emergency||0) }
    })

    res.json({ success: true, data: months })
  } catch (err) {
    console.error('Appointments by month error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch appointment trends' })
  }
}

// ── GET /api/v1/reports/revenue-by-month ────────────────────
export async function revenueByMonth(req, res) {
  try {
    const year  = req.query.year || new Date().getFullYear()
    const where = req.user.role === 'HOSPITAL_ADMIN' ? { hospital_id: req.user.hospital_id } : {}

    const rows = await Bill.findAll({
      where: {
        ...where,
        status: 'PAID',
        bill_date: { [Op.gte]: `${year}-01-01`, [Op.lte]: `${year}-12-31` },
      },
      attributes: [
        [fn('MONTH', col('bill_date')), 'month'],
        [fn('COUNT', col('id')), 'bills'],
        [fn('SUM', col('total_amount')), 'revenue'],
      ],
      group: [fn('MONTH', col('bill_date'))],
      order: [[fn('MONTH', col('bill_date')), 'ASC']],
      raw: true,
    })

    const months = Array.from({ length: 12 }, (_, i) => {
      const found = rows.find(r => parseInt(r.month) === i + 1)
      return { month: i + 1, bills: parseInt(found?.bills||0), revenue: parseFloat(found?.revenue||0) }
    })

    res.json({ success: true, data: months })
  } catch (err) {
    console.error('Revenue by month error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch revenue trends' })
  }
}

// ── GET /api/v1/reports/animals-by-type ─────────────────────
export async function animalsByType(req, res) {
  try {
    const where = req.user.role === 'HOSPITAL_ADMIN' ? { hospital_id: req.user.hospital_id } : {}

    const rows = await Animal.findAll({
      where,
      attributes: ['animal_type', [fn('COUNT', col('id')), 'count']],
      group: ['animal_type'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      raw: true,
    })

    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch animal distribution' })
  }
}

// ── GET /api/v1/reports/disease-analysis ───────────────────
export async function diseaseAnalysis(req, res) {
  try {
    const { limit = 10 } = req.query
    const where = req.user.role === 'HOSPITAL_ADMIN' ? { hospital_id: req.user.hospital_id } : {}

    const rows = await DiseaseHistory.findAll({
      where,
      attributes: ['disease_name', [fn('COUNT', col('id')), 'count']],
      group: ['disease_name'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      limit: parseInt(limit),
      raw: true,
    })

    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch disease analysis' })
  }
}

// ── GET /api/v1/reports/medicine-consumption ───────────────
export async function medicineConsumption(req, res) {
  try {
    const { limit = 10 } = req.query
    const where = { type: { [Op.in]: ['OUT','DISPENSED'] } }
    if (req.user.role === 'HOSPITAL_ADMIN') where.hospital_id = req.user.hospital_id

    const rows = await StockMovement.findAll({
      where,
      attributes: ['medicine_id', [fn('SUM', col('quantity')), 'total_used']],
      include: [{ model: Medicine, as: 'medicine', attributes: ['name','category','unit'] }],
      group: ['medicine_id', 'medicine.id', 'medicine.name', 'medicine.category', 'medicine.unit'],
      order: [[fn('SUM', col('quantity')), 'DESC']],
      limit: parseInt(limit),
      raw: false,
    })

    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('Medicine consumption error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch medicine consumption' })
  }
}

// ── GET /api/v1/reports/billing-by-type ────────────────────
export async function billingByType(req, res) {
  try {
    const where = { status: 'PAID', ...(req.user.role === 'HOSPITAL_ADMIN' ? { hospital_id: req.user.hospital_id } : {}) }

    const rows = await Bill.findAll({
      where,
      attributes: ['bill_type', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('total_amount')), 'revenue']],
      group: ['bill_type'],
      order: [[fn('SUM', col('total_amount')), 'DESC']],
      raw: true,
    })

    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch billing breakdown' })
  }
}

// ── GET /api/v1/reports/hospital-performance ───────────────
export async function hospitalPerformance(req, res) {
  try {
    const hospitals = await Hospital.findAll({
      where: { status: 'ACTIVE' },
      attributes: ['id','name','code'],
    })

    const data = await Promise.all(hospitals.map(async h => {
      const [appointments, animals, revenue, doctors] = await Promise.all([
        Appointment.count({ where: { hospital_id: h.id } }),
        Animal.count({ where: { hospital_id: h.id } }),
        Bill.sum('total_amount', { where: { hospital_id: h.id, status: 'PAID' } }),
        User.count({ where: { hospital_id: h.id, role: 'DOCTOR', status: 'ACTIVE' } }),
      ])
      return { id: h.id, name: h.name, code: h.code, appointments, animals, revenue: revenue || 0, doctors }
    }))

    res.json({ success: true, data })
  } catch (err) {
    console.error('Hospital performance error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch hospital performance' })
  }
}

// ── GET /api/v1/reports/vaccination-summary ────────────────
export async function vaccinationSummary(req, res) {
  try {
    const where = req.user.role === 'HOSPITAL_ADMIN' ? { hospital_id: req.user.hospital_id } : {}

    const rows = await VaccinationRecord.findAll({
      where,
      attributes: ['vaccine_name', [fn('COUNT', col('id')), 'count']],
      group: ['vaccine_name'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      limit: 10,
      raw: true,
    })

    // Upcoming due
    const today   = new Date().toISOString().split('T')[0]
    const in30    = new Date(); in30.setDate(in30.getDate()+30)
    const dueSoon = await VaccinationRecord.count({
      where: { ...where, next_due_at: { [Op.gte]: today, [Op.lte]: in30.toISOString().split('T')[0] } },
    })
    const overdue = await VaccinationRecord.count({
      where: { ...where, next_due_at: { [Op.lt]: today } },
    })

    res.json({ success: true, data: { vaccines: rows, dueSoon, overdue } })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch vaccination summary' })
  }
}

// ── GET /api/v1/reports/payment-mode-breakdown ─────────────
export async function paymentModeBreakdown(req, res) {
  try {
    const where = { status: 'PAID', ...(req.user.role === 'HOSPITAL_ADMIN' ? { hospital_id: req.user.hospital_id } : {}) }

    const rows = await Bill.findAll({
      where,
      attributes: ['payment_mode', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('total_amount')), 'total']],
      group: ['payment_mode'],
      order: [[fn('SUM', col('total_amount')), 'DESC']],
      raw: true,
    })

    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch payment breakdown' })
  }
}
