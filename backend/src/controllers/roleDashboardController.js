import { Op, fn, col } from 'sequelize'
import {
  User, Hospital, Animal, AnimalOwner,
  Appointment, Bill, MedicineBatch, Medicine,
  StockMovement, InventoryStock, InventoryItem,
  DiseaseHistory, VaccinationRecord,
} from '../models/index.js'

const today     = () => new Date().toISOString().split('T')[0]
const monthStart= () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
const in30Days  = () => { const d = new Date(); d.setDate(d.getDate()+30); return d.toISOString().split('T')[0] }

// ── GET /api/v1/role-dashboard/doctor ───────────────────────
export async function doctorDashboard(req, res) {
  try {
    const doctorId = req.user.id
    const hId      = req.user.hospital_id

    const [
      todayAppts, pendingAppts, completedAppts, totalAppts,
      myAnimals, recentAppts, upcomingVacc,
    ] = await Promise.all([
      Appointment.count({ where: { doctor_id: doctorId, appointment_date: today() } }),
      Appointment.count({ where: { doctor_id: doctorId, status: 'PENDING' } }),
      Appointment.count({ where: { doctor_id: doctorId, status: 'COMPLETED' } }),
      Appointment.count({ where: { doctor_id: doctorId } }),

      // Unique animals this doctor has seen
      Appointment.count({ where: { doctor_id: doctorId }, distinct: true, col: 'animal_id' }),

      // Today's queue
      Appointment.findAll({
        where: { doctor_id: doctorId, appointment_date: today() },
        include: [
          { model: Animal,      as: 'animal', attributes: ['id','animal_type','breed','name','ear_tag'] },
          { model: AnimalOwner, as: 'owner',  attributes: ['id','name','phone'] },
          { model: Hospital,    as: 'hospital', attributes: ['id','name'] },
        ],
        order: [['type','ASC'],['token_number','ASC']],
        limit: 10,
      }),

      // Vaccinations due soon for animals in their hospital
      VaccinationRecord.count({
        where: {
          next_due_at: { [Op.gte]: today(), [Op.lte]: in30Days() },
          ...(hId ? { hospital_id: hId } : {}),
        },
      }),
    ])

    // Recent disease records created by this doctor
    const recentDiseases = await DiseaseHistory.findAll({
      where: { doctor_id: doctorId },
      include: [{ model: Animal, as: 'animal', attributes: ['id','animal_type','breed','name'] }],
      order: [['created_at','DESC']],
      limit: 5,
    })

    res.json({
      success: true,
      data: {
        stats: { todayAppts, pendingAppts, completedAppts, totalAppts, myAnimals, upcomingVacc },
        todayQueue: recentAppts,
        recentDiseases,
      },
    })
  } catch (err) {
    console.error('Doctor dashboard error:', err)
    res.status(500).json({ success: false, message: 'Failed to load doctor dashboard' })
  }
}

// ── GET /api/v1/role-dashboard/hospital-admin ────────────────
export async function hospitalAdminDashboard(req, res) {
  try {
    const hId = req.user.hospital_id
    if (!hId) return res.status(400).json({ success: false, message: 'No hospital assigned' })

    const [
      totalStaff, totalDoctors, totalAnimals,
      todayAppts, pendingAppts,
      todayBills, pendingBills, monthRevenue,
      lowMedStock, expiringMed,
      lowInvStock,
      recentAppts, recentBills,
    ] = await Promise.all([
      User.count({ where: { hospital_id: hId, status: 'ACTIVE' } }),
      User.count({ where: { hospital_id: hId, role: 'DOCTOR', status: 'ACTIVE' } }),
      Animal.count({ where: { hospital_id: hId } }),

      Appointment.count({ where: { hospital_id: hId, appointment_date: today() } }),
      Appointment.count({ where: { hospital_id: hId, status: 'PENDING' } }),

      Bill.count({ where: { hospital_id: hId, bill_date: today() } }),
      Bill.count({ where: { hospital_id: hId, status: 'PENDING' } }),
      Bill.sum('total_amount', { where: { hospital_id: hId, status: 'PAID', bill_date: { [Op.gte]: monthStart() } } }),

      // Low medicine stock
      MedicineBatch.findAll({
        where: { hospital_id: hId, status: 'ACTIVE' },
        include: [{ model: Medicine, as: 'medicine', attributes: ['id','name','min_stock_level'] }],
      }).then(batches => {
        const map = {}
        batches.forEach(b => { const k = b.medicine_id; if (!map[k]) map[k] = { qty:0, min:b.medicine?.min_stock_level||10, name:b.medicine?.name }; map[k].qty += b.quantity })
        return Object.values(map).filter(m => m.qty <= m.min).length
      }),

      // Expiring medicines
      MedicineBatch.count({ where: { hospital_id: hId, status: 'ACTIVE', expiry_date: { [Op.lte]: in30Days() } } }),

      // Low inventory
      InventoryStock.findAll({
        where: { hospital_id: hId },
        include: [{ model: InventoryItem, as: 'item', attributes: ['min_stock_level'] }],
      }).then(stocks => stocks.filter(s => s.quantity <= (s.item?.min_stock_level||5)).length),

      Appointment.findAll({
        where: { hospital_id: hId, appointment_date: today() },
        include: [
          { model: Animal, as: 'animal', attributes: ['id','animal_type','breed','name'] },
          { model: User,   as: 'doctor', attributes: ['id','name'], required: false },
          { model: AnimalOwner, as: 'owner', attributes: ['id','name','phone'] },
        ],
        order: [['type','ASC'],['token_number','ASC']],
        limit: 8,
      }),

      Bill.findAll({
        where: { hospital_id: hId, bill_date: today() },
        include: [{ model: AnimalOwner, as: 'owner', attributes: ['id','name','phone'] }],
        order: [['created_at','DESC']],
        limit: 5,
      }),
    ])

    // Staff breakdown
    const staffByRole = await User.findAll({
      where: { hospital_id: hId, status: 'ACTIVE' },
      attributes: ['role', [fn('COUNT', col('id')), 'count']],
      group: ['role'],
      raw: true,
    })

    res.json({
      success: true,
      data: {
        stats: {
          totalStaff, totalDoctors, totalAnimals,
          todayAppts, pendingAppts,
          todayBills, pendingBills,
          monthRevenue: monthRevenue || 0,
          lowMedStock, expiringMed, lowInvStock,
        },
        staffByRole,
        todayQueue: recentAppts,
        recentBills,
      },
    })
  } catch (err) {
    console.error('Hospital admin dashboard error:', err)
    res.status(500).json({ success: false, message: 'Failed to load hospital admin dashboard' })
  }
}

// ── GET /api/v1/role-dashboard/receptionist ──────────────────
export async function receptionistDashboard(req, res) {
  try {
    const hId = req.user.hospital_id

    const [
      todayAppts, pendingAppts, confirmedAppts, emergencyAppts,
      todayBills, pendingBills,
      totalAnimals,
      recentAppts, recentBills,
    ] = await Promise.all([
      Appointment.count({ where: { ...(hId?{hospital_id:hId}:{}), appointment_date: today() } }),
      Appointment.count({ where: { ...(hId?{hospital_id:hId}:{}), status: 'PENDING' } }),
      Appointment.count({ where: { ...(hId?{hospital_id:hId}:{}), status: 'CONFIRMED', appointment_date: today() } }),
      Appointment.count({ where: { ...(hId?{hospital_id:hId}:{}), type: 'EMERGENCY', appointment_date: today() } }),

      Bill.count({ where: { ...(hId?{hospital_id:hId}:{}), bill_date: today() } }),
      Bill.count({ where: { ...(hId?{hospital_id:hId}:{}), status: 'PENDING' } }),

      Animal.count({ where: hId ? { hospital_id: hId } : {} }),

      Appointment.findAll({
        where: { ...(hId?{hospital_id:hId}:{}), appointment_date: today() },
        include: [
          { model: Animal,      as: 'animal', attributes: ['id','animal_type','breed','name','ear_tag'] },
          { model: AnimalOwner, as: 'owner',  attributes: ['id','name','phone','village'] },
          { model: User,        as: 'doctor', attributes: ['id','name'], required: false },
        ],
        order: [['type','ASC'],['token_number','ASC']],
        limit: 15,
      }),

      Bill.findAll({
        where: { ...(hId?{hospital_id:hId}:{}), bill_date: today() },
        include: [
          { model: AnimalOwner, as: 'owner',  attributes: ['id','name','phone'] },
          { model: Animal,      as: 'animal', attributes: ['id','animal_type','breed'], required: false },
        ],
        order: [['created_at','DESC']],
        limit: 8,
      }),
    ])

    res.json({
      success: true,
      data: {
        stats: { todayAppts, pendingAppts, confirmedAppts, emergencyAppts, todayBills, pendingBills, totalAnimals },
        todayQueue: recentAppts,
        recentBills,
      },
    })
  } catch (err) {
    console.error('Receptionist dashboard error:', err)
    res.status(500).json({ success: false, message: 'Failed to load receptionist dashboard' })
  }
}

// ── GET /api/v1/role-dashboard/pharmacist ────────────────────
export async function pharmacistDashboard(req, res) {
  try {
    const hId = req.user.hospital_id

    const medWhere = { status: 'ACTIVE', ...(hId ? { hospital_id: hId } : {}) }

    const allBatches = await MedicineBatch.findAll({
      where: medWhere,
      include: [
        { model: Medicine, as: 'medicine', attributes: ['id','name','category','unit','min_stock_level'] },
        { model: Hospital, as: 'hospital', attributes: ['id','name'], required: false },
      ],
    })

    // Group by medicine+hospital
    const medMap = {}
    allBatches.forEach(b => {
      const k = `${b.medicine_id}_${b.hospital_id}`
      if (!medMap[k]) medMap[k] = { medicine: b.medicine, hospital: b.hospital, total_qty: 0, batches: [] }
      medMap[k].total_qty += b.quantity
      medMap[k].batches.push(b)
    })
    const medStock = Object.values(medMap)

    const lowStock    = medStock.filter(s => s.total_qty <= (s.medicine?.min_stock_level||10))
    const expiring    = allBatches.filter(b => b.expiry_date && b.expiry_date <= in30Days() && b.expiry_date >= today())
    const expired     = allBatches.filter(b => b.expiry_date && b.expiry_date < today())

    const recentMovements = await StockMovement.findAll({
      where: hId ? { hospital_id: hId } : {},
      include: [{ model: Medicine, as: 'medicine', attributes: ['id','name','unit'] }],
      order: [['created_at','DESC']],
      limit: 10,
    })

    // Dispensed today
    const dispensedToday = await StockMovement.count({
      where: {
        ...(hId ? { hospital_id: hId } : {}),
        type: { [Op.in]: ['OUT','DISPENSED'] },
        created_at: { [Op.gte]: new Date(today()) },
      },
    })

    res.json({
      success: true,
      data: {
        stats: {
          totalMedicines: medStock.length,
          totalBatches: allBatches.length,
          lowStock: lowStock.length,
          expiring: expiring.length,
          expired: expired.length,
          dispensedToday,
        },
        lowStockItems: lowStock.slice(0, 10),
        expiringItems: expiring.slice(0, 10),
        recentMovements,
      },
    })
  } catch (err) {
    console.error('Pharmacist dashboard error:', err)
    res.status(500).json({ success: false, message: 'Failed to load pharmacist dashboard' })
  }
}
