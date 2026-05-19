import { Op, fn, col } from 'sequelize'
import {
  Hospital, District, User, Animal, Appointment,
  Bill, MedicineBatch, StockMovement, Medicine,
  InventoryStock, InventoryItem, DoctorHospital,
} from '../models/index.js'

// ── GET /api/v1/hospitals/:id/detail ────────────────────────
export async function getHospitalDetail(req, res) {
  try {
    const hospital = await Hospital.findByPk(req.params.id, {
      include: [{ model: District, as: 'district', attributes: ['id','name','code'] }],
    })
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' })

    const hId = hospital.id
    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

    // ── Staff breakdown ─────────────────────────────────────
    const staffRoles = ['HOSPITAL_ADMIN','DOCTOR','PHARMACIST','RECEPTIONIST']
    const staffCounts = await Promise.all(
      staffRoles.map(role => User.count({ where: { hospital_id: hId, role, status: 'ACTIVE' } }))
    )
    const staffByRole = {}
    staffRoles.forEach((r, i) => { staffByRole[r] = staffCounts[i] })

    // All staff list
    const staff = await User.findAll({
      where: { hospital_id: hId },
      attributes: ['id','name','email','role','status','specializations','last_login'],
      order: [['role','ASC'],['name','ASC']],
    })

    // Doctors assigned via DoctorHospital (multi-hospital)
    const assignedDoctors = await User.findAll({
      include: [{
        model: Hospital,
        as: 'assignedHospitals',
        where: { id: hId },
        through: { attributes: ['is_primary'] },
        attributes: [],
      }],
      attributes: ['id','name','email','specializations','registration_number','status'],
    })

    // ── Patients ─────────────────────────────────────────────
    const [totalAnimals, activeAnimals, animalsByType] = await Promise.all([
      Animal.count({ where: { hospital_id: hId } }),
      Animal.count({ where: { hospital_id: hId, status: 'ACTIVE' } }),
      Animal.findAll({
        where: { hospital_id: hId },
        attributes: ['animal_type', [fn('COUNT', col('id')), 'count']],
        group: ['animal_type'],
        raw: true,
      }),
    ])

    const recentAnimals = await Animal.findAll({
      where: { hospital_id: hId },
      attributes: ['id','animal_type','breed','name','ear_tag','status','created_at'],
      order: [['created_at','DESC']],
      limit: 5,
    })

    // ── Appointments ─────────────────────────────────────────
    const [totalAppts, todayAppts, pendingAppts, completedAppts] = await Promise.all([
      Appointment.count({ where: { hospital_id: hId } }),
      Appointment.count({ where: { hospital_id: hId, appointment_date: today } }),
      Appointment.count({ where: { hospital_id: hId, status: 'PENDING' } }),
      Appointment.count({ where: { hospital_id: hId, status: 'COMPLETED' } }),
    ])

    const recentAppts = await Appointment.findAll({
      where: { hospital_id: hId },
      include: [
        { model: Animal,      as: 'animal', attributes: ['id','animal_type','breed','name'], required: false },
        { model: User,        as: 'doctor', attributes: ['id','name'], required: false },
      ],
      order: [['created_at','DESC']],
      limit: 5,
    })

    // ── Billing ──────────────────────────────────────────────
    const [totalBills, todayBills, pendingBills, monthRevenue, totalRevenue] = await Promise.all([
      Bill.count({ where: { hospital_id: hId } }),
      Bill.count({ where: { hospital_id: hId, bill_date: today } }),
      Bill.count({ where: { hospital_id: hId, status: 'PENDING' } }),
      Bill.sum('total_amount', { where: { hospital_id: hId, status: 'PAID', bill_date: { [Op.gte]: monthStart } } }),
      Bill.sum('total_amount', { where: { hospital_id: hId, status: 'PAID' } }),
    ])

    const recentBills = await Bill.findAll({
      where: { hospital_id: hId },
      attributes: ['id','bill_number','bill_type','total_amount','status','bill_date','payment_mode'],
      order: [['created_at','DESC']],
      limit: 5,
    })

    // ── Stock ────────────────────────────────────────────────
    const medicineStock = await MedicineBatch.findAll({
      where: { hospital_id: hId, status: 'ACTIVE' },
      include: [{ model: Medicine, as: 'medicine', attributes: ['id','name','category','unit','min_stock_level'] }],
      order: [['expiry_date','ASC']],
      limit: 10,
    })

    const recentMovements = await StockMovement.findAll({
      where: { hospital_id: hId },
      include: [{ model: Medicine, as: 'medicine', attributes: ['id','name','unit'] }],
      order: [['created_at','DESC']],
      limit: 8,
    })

    const inventoryStock = await InventoryStock.findAll({
      where: { hospital_id: hId },
      include: [{ model: InventoryItem, as: 'item', attributes: ['id','name','category','unit','min_stock_level'] }],
      order: [['updated_at','DESC']],
      limit: 8,
    })

    res.json({
      success: true,
      data: {
        hospital,
        staff: {
          byRole: staffByRole,
          total:  Object.values(staffByRole).reduce((s,c) => s+c, 0),
          list:   staff,
          assignedDoctors,
        },
        animals: {
          total: totalAnimals, active: activeAnimals,
          byType: animalsByType, recent: recentAnimals,
        },
        appointments: {
          total: totalAppts, today: todayAppts,
          pending: pendingAppts, completed: completedAppts,
          recent: recentAppts,
        },
        billing: {
          total: totalBills, today: todayBills,
          pending: pendingBills,
          monthRevenue: monthRevenue || 0,
          totalRevenue: totalRevenue || 0,
          recent: recentBills,
        },
        stock: {
          medicines: medicineStock,
          recentMovements,
          inventory: inventoryStock,
        },
      },
    })
  } catch (err) {
    console.error('Hospital detail error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch hospital details' })
  }
}
