import { Op, fn, col } from 'sequelize'
import {
  Bill, BillItem, Animal, AnimalOwner, Hospital, User,
  Appointment, MedicineBatch, Medicine, StockMovement,
  InventoryStock, InventoryItem,
} from '../models/index.js'

// ── GET /api/v1/print/billing-summary ───────────────────────
export async function billingSummary(req, res) {
  try {
    const { date, hospital_id } = req.query
    const targetDate = date || new Date().toISOString().split('T')[0]
    const hId = req.user.role === 'HOSPITAL_ADMIN' ? req.user.hospital_id : (hospital_id || null)

    const where = { bill_date: targetDate }
    if (hId) where.hospital_id = hId

    const bills = await Bill.findAll({
      where,
      include: [
        { model: AnimalOwner, as: 'owner',    attributes: ['id','name','phone','village'] },
        { model: Animal,      as: 'animal',   attributes: ['id','animal_type','breed','name'], required: false },
        { model: Hospital,    as: 'hospital', attributes: ['id','name','code','address','phone'] },
        { model: BillItem,    as: 'items' },
        { model: User,        as: 'createdByUser', attributes: ['id','name'], required: false },
      ],
      order: [['created_at','ASC']],
    })

    // Summary stats
    const totalBills    = bills.length
    const totalRevenue  = bills.filter(b=>b.status==='PAID').reduce((s,b)=>s+parseFloat(b.total_amount||0),0)
    const pendingAmount = bills.filter(b=>b.status==='PENDING').reduce((s,b)=>s+parseFloat(b.total_amount||0),0)
    const byType = {}
    const byPayment = {}
    bills.forEach(b => {
      byType[b.bill_type]       = (byType[b.bill_type]       || 0) + parseFloat(b.total_amount||0)
      byPayment[b.payment_mode] = (byPayment[b.payment_mode] || 0) + parseFloat(b.total_amount||0)
    })

    const hospital = hId ? await Hospital.findByPk(hId, { attributes:['name','code','address','phone'] }) : null

    res.json({
      success: true,
      data: {
        date: targetDate, hospital,
        bills, totalBills, totalRevenue, pendingAmount,
        byType, byPayment,
        paidCount:    bills.filter(b=>b.status==='PAID').length,
        pendingCount: bills.filter(b=>b.status==='PENDING').length,
      },
    })
  } catch (err) {
    console.error('Billing summary print error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch billing summary' })
  }
}

// ── GET /api/v1/print/stock-report ──────────────────────────
export async function stockReport(req, res) {
  try {
    const { hospital_id } = req.query
    const hId = req.user.role === 'HOSPITAL_ADMIN' ? req.user.hospital_id : (hospital_id || null)
    const today = new Date().toISOString().split('T')[0]
    const in30  = new Date(); in30.setDate(in30.getDate()+30)

    const medWhere = { status:'ACTIVE' }
    if (hId) medWhere.hospital_id = hId

    const [medicineBatches, inventoryItems, recentMovements] = await Promise.all([
      MedicineBatch.findAll({
        where: medWhere,
        include: [
          { model: Medicine, as: 'medicine', attributes: ['id','name','category','unit','min_stock_level'] },
          { model: Hospital, as: 'hospital', attributes: ['id','name','code'] },
        ],
        order: [['expiry_date','ASC']],
      }),
      InventoryStock.findAll({
        where: hId ? { hospital_id: hId } : {},
        include: [
          { model: InventoryItem, as: 'item',     attributes: ['id','name','category','unit','min_stock_level'] },
          { model: Hospital,      as: 'hospital', attributes: ['id','name','code'] },
        ],
      }),
      StockMovement.findAll({
        where: {
          ...(hId ? { hospital_id: hId } : {}),
          created_at: { [Op.gte]: new Date(Date.now() - 7*24*60*60*1000) },
        },
        include: [{ model: Medicine, as: 'medicine', attributes: ['id','name','unit'] }],
        order: [['created_at','DESC']],
        limit: 50,
      }),
    ])

    // Aggregate medicine stock by medicine+hospital
    const medMap = {}
    medicineBatches.forEach(b => {
      const key = `${b.medicine_id}_${b.hospital_id}`
      if (!medMap[key]) medMap[key] = { medicine: b.medicine, hospital: b.hospital, total_qty: 0, batches: [], expiring: false, expired: false }
      medMap[key].total_qty += b.quantity
      medMap[key].batches.push(b)
      const days = Math.ceil((new Date(b.expiry_date)-new Date(today))/(86400000))
      if (days <= 0)  medMap[key].expired  = true
      if (days <= 30) medMap[key].expiring = true
    })
    const medStock = Object.values(medMap)

    const hospital = hId ? await Hospital.findByPk(hId, { attributes:['name','code','address','phone'] }) : null

    res.json({
      success: true,
      data: {
        date: today, hospital,
        medStock,
        inventoryItems,
        recentMovements,
        summary: {
          totalMedicines:  medStock.length,
          lowStock:        medStock.filter(s => s.total_qty <= (s.medicine?.min_stock_level||10)).length,
          expiring:        medStock.filter(s => s.expiring && !s.expired).length,
          expired:         medStock.filter(s => s.expired).length,
          totalInventory:  inventoryItems.length,
          lowInventory:    inventoryItems.filter(s => s.quantity <= (s.item?.min_stock_level||5)).length,
        },
      },
    })
  } catch (err) {
    console.error('Stock report print error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch stock report' })
  }
}

// ── GET /api/v1/print/appointment-queue ─────────────────────
export async function appointmentQueue(req, res) {
  try {
    const { date, hospital_id } = req.query
    const targetDate = date || new Date().toISOString().split('T')[0]
    const hId = req.user.role === 'HOSPITAL_ADMIN' ? req.user.hospital_id : (hospital_id || null)

    const where = { appointment_date: targetDate }
    if (hId) where.hospital_id = hId

    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: Animal,      as: 'animal',   attributes: ['id','animal_type','breed','name','ear_tag'] },
        { model: AnimalOwner, as: 'owner',    attributes: ['id','name','phone','village'] },
        { model: Hospital,    as: 'hospital', attributes: ['id','name','code'] },
        { model: User,        as: 'doctor',   attributes: ['id','name','specializations'], required: false },
      ],
      order: [
        ['type', 'ASC'],  // EMERGENCY first alphabetically
        ['token_number','ASC'],
      ],
    })

    const hospital = hId ? await Hospital.findByPk(hId, { attributes:['name','code','address','phone'] }) : null

    res.json({
      success: true,
      data: {
        date: targetDate, hospital, appointments,
        summary: {
          total:     appointments.length,
          emergency: appointments.filter(a=>a.type==='EMERGENCY').length,
          pending:   appointments.filter(a=>a.status==='PENDING').length,
          completed: appointments.filter(a=>a.status==='COMPLETED').length,
        },
      },
    })
  } catch (err) {
    console.error('Appointment queue print error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch appointment queue' })
  }
}
