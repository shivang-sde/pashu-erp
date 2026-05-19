import { Op, fn, col } from 'sequelize'
import { sendBillCreated, sendBillReceipt } from '../services/emailService.js'
import sequelize from '../config/database.js'
import { Bill, BillItem, Animal, AnimalOwner, Hospital, User, Appointment } from '../models/index.js'
import { createAuditLog } from '../middleware/auditLog.js'

const BILL_INCLUDE = [
  { model: AnimalOwner, as: 'owner',    attributes: ['id','name','phone','address','village'] },
  { model: Animal,      as: 'animal',   attributes: ['id','animal_type','breed','name','ear_tag'], required: false },
  { model: Hospital,    as: 'hospital', attributes: ['id','name','code','address','phone'] },
  { model: User,        as: 'createdByUser', attributes: ['id','name','role'], required: false },
  { model: BillItem,    as: 'items' },
]

// ── helpers ──────────────────────────────────────────────────
function calcTotals(items, discountPct = 0) {
  const subtotal  = items.reduce((s, i) => s + (parseFloat(i.unit_price) * parseInt(i.quantity)), 0)
  const taxAmount = items.reduce((s, i) => s + (parseFloat(i.unit_price) * parseInt(i.quantity) * (parseFloat(i.tax_pct||0)/100)), 0)
  const discount  = subtotal * (parseFloat(discountPct) / 100)
  const total     = subtotal + taxAmount - discount
  return { subtotal: +subtotal.toFixed(2), tax_amount: +taxAmount.toFixed(2), discount_amount: +discount.toFixed(2), total_amount: +total.toFixed(2) }
}

async function generateBillNumber(hospitalId) {
  const today  = new Date()
  const prefix = `BILL-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}`
  // Retry up to 10 times to find a unique number
  for (let attempt = 0; attempt < 10; attempt++) {
    const count   = await Bill.count({ where: { hospital_id: hospitalId } })
    const billNo  = `${prefix}-${String(count + 1 + attempt).padStart(4,'0')}`
    const exists  = await Bill.findOne({ where: { bill_number: billNo }, paranoid: false })
    if (!exists) return billNo
  }
  // Absolute fallback: timestamp + random to guarantee uniqueness
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `${prefix}-${Date.now().toString().slice(-6)}${rand}`
}

// ── GET /api/v1/billing ─────────────────────────────────────
export async function list(req, res) {
  try {
    const { page=1, limit=10, search='', status='', type='', hospital_id='', date_from='', date_to='' } = req.query
    const where = {}
    if (status)      where.status       = status
    if (type)        where.bill_type    = type

    if (req.user.role === 'HOSPITAL_ADMIN') where.hospital_id = req.user.hospital_id
    else if (hospital_id)                   where.hospital_id = hospital_id

    if (date_from || date_to) {
      where.bill_date = {}
      if (date_from) where.bill_date[Op.gte] = date_from
      if (date_to)   where.bill_date[Op.lte] = date_to
    }

    const offset = (parseInt(page)-1) * parseInt(limit)

    const { count, rows } = await Bill.findAndCountAll({
      where,
      include: [
        { model: AnimalOwner, as: 'owner',    attributes: ['id','name','phone'] },
        { model: Animal,      as: 'animal',   attributes: ['id','animal_type','breed','name'], required: false },
        { model: Hospital,    as: 'hospital', attributes: ['id','name'] },
        { model: BillItem,    as: 'items' },
      ],
      order: [['created_at','DESC']],
      limit: parseInt(limit),
      offset,
      distinct: true,
    })

    // Filter by owner/animal name after DB query
    let bills = rows
    if (search) {
      const q = search.toLowerCase()
      bills = rows.filter(b =>
        b.bill_number?.toLowerCase().includes(q) ||
        b.owner?.name?.toLowerCase().includes(q) ||
        b.owner?.phone?.includes(q) ||
        b.animal?.name?.toLowerCase().includes(q)
      )
    }

    res.json({
      success: true,
      data: {
        bills,
        pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count/parseInt(limit)) },
      },
    })
  } catch (err) {
    console.error('Bill list error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch bills' })
  }
}

// ── GET /api/v1/billing/:id ─────────────────────────────────
export async function getOne(req, res) {
  try {
    const bill = await Bill.findByPk(req.params.id, { include: BILL_INCLUDE })
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' })
    res.json({ success: true, data: bill })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch bill' })
  }
}

// ── POST /api/v1/billing ────────────────────────────────────
export async function create(req, res) {
  const t = await sequelize.transaction()
  try {
    const {
      owner_id, animal_id, hospital_id, appointment_id,
      bill_type, bill_date, payment_mode, discount_pct,
      notes, items = [],
    } = req.body

    // Filter out blank items (safety net)
    const cleanItems = (items || []).filter(i => i && i.item_name && String(i.item_name).trim())

    // Resolve hospital — HOSPITAL_ADMIN always uses their own hospital
    const hId = req.user.role === 'HOSPITAL_ADMIN'
      ? req.user.hospital_id
      : (hospital_id || null)

    if (!owner_id || !hId || !cleanItems.length) {
      await t.rollback()
      const missing = !owner_id ? 'Owner' : !hId ? 'Hospital' : 'At least one item'
      return res.status(400).json({ success: false, message: missing + ' is required' })
    }
    const totals = calcTotals(cleanItems, discount_pct || 0)
    const billNo = await generateBillNumber(hId)

    // Determine status based on payment mode
    const status = payment_mode === 'FREE' ? 'PAID' : 'PENDING'

    const bill = await Bill.create({
      bill_number:     billNo,
      owner_id,
      animal_id:       animal_id || null,
      hospital_id:     hId,
      appointment_id:  appointment_id || null,
      bill_type:       bill_type || 'OPD',
      bill_date:       bill_date || new Date().toISOString().split('T')[0],
      payment_mode:    payment_mode || 'CASH',
      status,
      discount_pct:    parseFloat(discount_pct || 0),
      subtotal:        totals.subtotal,
      tax_amount:      totals.tax_amount,
      discount_amount: totals.discount_amount,
      total_amount:    totals.total_amount,
      paid_amount:     status === 'PAID' ? totals.total_amount : 0,
      notes,
      created_by:      req.user.id,
    }, { transaction: t })

    // Create bill items
    const billItems = cleanItems.map(i => ({
      bill_id:     bill.id,
      item_name:   i.item_name,
      item_type:   i.item_type || 'SERVICE',
      quantity:    parseInt(i.quantity) || 1,
      unit_price:  parseFloat(i.unit_price) || 0,
      tax_pct:     parseFloat(i.tax_pct) || 0,
      amount:      parseFloat(i.unit_price) * (parseInt(i.quantity) || 1),
      description: i.description || null,
    }))
    await BillItem.bulkCreate(billItems, { transaction: t })

    await t.commit()

    await createAuditLog({ userId: req.user.id, action: 'CREATE_BILL', tableName: 'bills', recordId: bill.id, newValues: { bill_number: billNo, total_amount: totals.total_amount, payment_mode }, req })

    const result = await Bill.findByPk(bill.id, { include: BILL_INCLUDE })
    // Auto-send bill created email
    if (result?.owner?.email) {
      sendBillCreated({
        to:        result.owner.email,
        ownerName: result.owner.name,
        bill:      result,
        hospital:  result.hospital,
      }).catch(e => console.error('Bill created email error:', e))
    }

    res.status(201).json({ success: true, data: result, message: 'Bill created successfully' })
  } catch (err) {
    await t.rollback()
    console.error('Bill create error name:', err.name)
    console.error('Bill create error message:', err.message)
    console.error('Bill create error original:', err.original?.message)
    console.error('Bill create error sql:', err.sql)
    res.status(500).json({
      success: false,
      message: 'Failed to create bill',
      detail: err.original?.message || err.message,
    })
  }
}

// ── POST /api/v1/billing/:id/pay ────────────────────────────
export async function pay(req, res) {
  try {
    const bill = await Bill.findByPk(req.params.id)
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' })
    if (bill.status === 'PAID') return res.status(400).json({ success: false, message: 'Bill is already paid' })

    const { payment_mode, paid_amount, transaction_id } = req.body
    const amount = parseFloat(paid_amount) || bill.total_amount

    await bill.update({
      status:         'PAID',
      payment_mode:   payment_mode || bill.payment_mode,
      paid_amount:    amount,
      transaction_id: transaction_id || null,
      paid_at:        new Date(),
    })

    await createAuditLog({ userId: req.user.id, action: 'PAY_BILL', tableName: 'bills', recordId: bill.id, newValues: { payment_mode, paid_amount: amount }, req })

    const result = await Bill.findByPk(bill.id, { include: BILL_INCLUDE })

    // Auto-send receipt email if owner has email
    if (result?.owner?.email) {
      sendBillReceipt({
        to:        result.owner.email,
        ownerName: result.owner.name,
        bill:      result,
        hospital:  result.hospital,
      }).catch(err => console.error('Receipt email error:', err))
    }

    res.json({ success: true, data: result, message: 'Payment recorded successfully' })
  } catch (err) {
    console.error('Bill pay error:', err)
    res.status(500).json({ success: false, message: 'Failed to record payment' })
  }
}

// ── PATCH /api/v1/billing/:id/cancel ────────────────────────
export async function cancel(req, res) {
  try {
    const bill = await Bill.findByPk(req.params.id)
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' })
    if (bill.status === 'PAID') return res.status(400).json({ success: false, message: 'Cannot cancel a paid bill' })

    await bill.update({ status: 'CANCELLED', notes: req.body.reason || bill.notes })
    await createAuditLog({ userId: req.user.id, action: 'CANCEL_BILL', tableName: 'bills', recordId: bill.id, req })

    res.json({ success: true, message: 'Bill cancelled' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cancel bill' })
  }
}

// ── GET /api/v1/billing/stats ────────────────────────────────
export async function getStats(req, res) {
  try {
    const today     = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const hId = req.user.role === 'HOSPITAL_ADMIN' ? req.user.hospital_id : null
    const where = hId ? { hospital_id: hId } : {}

    const [totalBills, todayBills, pendingBills, monthRevenue] = await Promise.all([
      Bill.count({ where }),
      Bill.count({ where: { ...where, bill_date: today } }),
      Bill.count({ where: { ...where, status: 'PENDING' } }),
      Bill.sum('total_amount', { where: { ...where, status: 'PAID', bill_date: { [Op.gte]: monthStart } } }),
    ])

    res.json({ success: true, data: { totalBills, todayBills, pendingBills, monthRevenue: monthRevenue || 0 } })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' })
  }
}

// ── GET /api/v1/billing/owners/search ───────────────────────
export async function searchOwners(req, res) {
  try {
    const { q = '' } = req.query
    if (!q || q.length < 2) return res.json({ success: true, data: [] })

    const owners = await AnimalOwner.findAll({
      where: { [Op.or]: [{ name: { [Op.like]: `%${q}%` } }, { phone: { [Op.like]: `%${q}%` } }] },
      attributes: ['id','name','phone','address','village'],
      limit: 10,
    })
    res.json({ success: true, data: owners })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to search owners' })
  }
}

// ── GET /api/v1/billing/owners/:id/animals ──────────────────
export async function getOwnerAnimals(req, res) {
  try {
    const animals = await Animal.findAll({
      where: { owner_id: req.params.id, status: 'ACTIVE' },
      attributes: ['id','animal_type','breed','name','ear_tag'],
    })
    res.json({ success: true, data: animals })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch animals' })
  }
}

// ── GET /api/v1/billing/hospitals/list ──────────────────────
export async function getHospitalsList(req, res) {
  try {
    const where = { status: 'ACTIVE' }
    if (req.user.role === 'HOSPITAL_ADMIN') where.id = req.user.hospital_id
    const hospitals = await Hospital.findAll({ where, attributes: ['id','name','code','address','phone'], order: [['name','ASC']] })
    res.json({ success: true, data: hospitals })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch hospitals' })
  }
}
