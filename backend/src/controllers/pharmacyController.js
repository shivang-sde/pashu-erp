import { Op, fn, col, literal } from 'sequelize'
import sequelize from '../config/database.js'
import { Medicine, MedicineBatch, StockMovement, Hospital, User } from '../models/index.js'
import { createAuditLog } from '../middleware/auditLog.js'

// ── GET /api/v1/pharmacy/medicines ──────────────────────────
export async function listMedicines(req, res) {
  try {
    const { page=1, limit=10, search='', category='', status='' } = req.query
    const where = {}
    if (search)   where[Op.or] = [{ name:{[Op.like]:`%${search}%`} }, { generic_name:{[Op.like]:`%${search}%`} }]
    if (category) where.category = category
    if (status)   where.status   = status

    const offset = (parseInt(page)-1)*parseInt(limit)
    const { count, rows } = await Medicine.findAndCountAll({
      where, order:[['name','ASC']], limit:parseInt(limit), offset,
    })

    res.json({ success:true, data:{ medicines:rows, pagination:{ total:count, page:parseInt(page), limit:parseInt(limit), pages:Math.ceil(count/parseInt(limit)) } } })
  } catch (err) {
    console.error('Medicine list error:', err)
    res.status(500).json({ success:false, message:'Failed to fetch medicines' })
  }
}

// ── POST /api/v1/pharmacy/medicines ─────────────────────────
export async function createMedicine(req, res) {
  try {
    const { name, generic_name, category, unit, manufacturer, description, min_stock_level } = req.body
    if (!name) return res.status(400).json({ success:false, message:'Medicine name is required' })

    const exists = await Medicine.findOne({ where:{ name:{ [Op.like]: name.trim() } } })
    if (exists) return res.status(409).json({ success:false, message:'Medicine with this name already exists' })

    const medicine = await Medicine.create({ name:name.trim(), generic_name, category, unit, manufacturer, description, min_stock_level })
    await createAuditLog({ userId:req.user.id, action:'CREATE_MEDICINE', tableName:'medicines', recordId:medicine.id, newValues:req.body, req })
    res.status(201).json({ success:true, data:medicine, message:'Medicine created' })
  } catch (err) {
    console.error('Medicine create error:', err)
    res.status(500).json({ success:false, message:'Failed to create medicine' })
  }
}

// ── PUT /api/v1/pharmacy/medicines/:id ──────────────────────
export async function updateMedicine(req, res) {
  try {
    const med = await Medicine.findByPk(req.params.id)
    if (!med) return res.status(404).json({ success:false, message:'Medicine not found' })
    const old = med.toJSON()
    await med.update(req.body)
    await createAuditLog({ userId:req.user.id, action:'UPDATE_MEDICINE', tableName:'medicines', recordId:med.id, oldValues:old, newValues:req.body, req })
    res.json({ success:true, data:med, message:'Medicine updated' })
  } catch (err) {
    res.status(500).json({ success:false, message:'Failed to update medicine' })
  }
}

// ── GET /api/v1/pharmacy/stock ───────────────────────────────
// Stock summary per medicine per hospital
export async function getStock(req, res) {
  try {
    const { page=1, limit=10, search='', hospital_id='', low_stock='' } = req.query
    const today = new Date().toISOString().split('T')[0]

    const hospitalId = req.user.role === 'HOSPITAL_ADMIN' ? req.user.hospital_id : (hospital_id || null)

    // Get all active batches grouped by medicine+hospital
    const batchWhere = { status:'ACTIVE' }
    if (hospitalId) batchWhere.hospital_id = hospitalId

    const batches = await MedicineBatch.findAll({
      where: batchWhere,
      include: [
        { model: Medicine, as:'medicine', attributes:['id','name','generic_name','category','unit','min_stock_level'],
          ...(search ? { where:{ [Op.or]:[{ name:{[Op.like]:`%${search}%`} }, { generic_name:{[Op.like]:`%${search}%`} }] } } : {}) },
        { model: Hospital, as:'hospital', attributes:['id','name','code'] },
      ],
      order:[['expiry_date','ASC']],
    })

    // Group by medicine+hospital
    const map = {}
    for (const b of batches) {
      if (!b.medicine) continue
      const key = `${b.medicine_id}_${b.hospital_id}`
      if (!map[key]) {
        map[key] = {
          medicine_id:  b.medicine_id,
          hospital_id:  b.hospital_id,
          medicine:     b.medicine,
          hospital:     b.hospital,
          total_qty:    0,
          batches:      [],
          expiring_soon: false,
          expired:      false,
        }
      }
      map[key].total_qty += b.quantity
      map[key].batches.push(b)

      // Check expiry
      const daysToExpiry = Math.ceil((new Date(b.expiry_date) - new Date(today)) / (1000*60*60*24))
      if (daysToExpiry <= 0)  map[key].expired       = true
      if (daysToExpiry <= 30) map[key].expiring_soon = true
    }

    let items = Object.values(map)

    // Low stock filter
    if (low_stock === 'true') {
      items = items.filter(i => i.total_qty <= (i.medicine?.min_stock_level || 10))
    }

    const total  = items.length
    const offset = (parseInt(page)-1)*parseInt(limit)
    const paged  = items.slice(offset, offset+parseInt(limit))

    res.json({
      success:true,
      data:{
        stock: paged,
        pagination:{ total, page:parseInt(page), limit:parseInt(limit), pages:Math.ceil(total/parseInt(limit)) },
      },
    })
  } catch (err) {
    console.error('Stock error:', err)
    res.status(500).json({ success:false, message:'Failed to fetch stock' })
  }
}

// ── POST /api/v1/pharmacy/stock-in ──────────────────────────
export async function stockIn(req, res) {
  try {
    const { medicine_id, hospital_id, batch_number, quantity, unit_price, expiry_date, manufacture_date, supplier, received_date, notes } = req.body

    if (!medicine_id || !batch_number || !quantity || !expiry_date) {
      return res.status(400).json({ success:false, message:'Medicine, batch number, quantity and expiry date are required' })
    }

    const hId = req.user.role === 'HOSPITAL_ADMIN' ? req.user.hospital_id : (hospital_id || req.user.hospital_id)
    if (!hId) return res.status(400).json({ success:false, message:'Hospital is required' })

    // Find existing batch or create new
    let batch = await MedicineBatch.findOne({ where:{ medicine_id, hospital_id:hId, batch_number } })
    if (batch) {
      await batch.update({ quantity: batch.quantity + parseInt(quantity), status:'ACTIVE' })
    } else {
      batch = await MedicineBatch.create({
        medicine_id, hospital_id:hId, batch_number,
        quantity:parseInt(quantity), unit_price, expiry_date,
        manufacture_date, supplier,
        received_date: received_date || new Date().toISOString().split('T')[0],
        received_by: req.user.id,
        status:'ACTIVE',
      })
    }

    // Audit movement
    await StockMovement.create({
      medicine_id, batch_id:batch.id, hospital_id:hId,
      type:'IN', quantity:parseInt(quantity),
      notes, performed_by:req.user.id,
    })

    await createAuditLog({ userId:req.user.id, action:'STOCK_IN', tableName:'medicine_batches', recordId:batch.id, newValues:{ medicine_id, quantity, batch_number, expiry_date }, req })

    res.status(201).json({ success:true, data:batch, message:`${quantity} units added to stock` })
  } catch (err) {
    console.error('Stock in error:', err)
    res.status(500).json({ success:false, message:'Failed to add stock' })
  }
}

// ── POST /api/v1/pharmacy/stock-out ─────────────────────────
export async function stockOut(req, res) {
  try {
    const { medicine_id, batch_id, quantity, notes, reference_id, reference_type } = req.body
    if (!medicine_id || !quantity) return res.status(400).json({ success:false, message:'Medicine and quantity are required' })

    const hId = req.user.hospital_id
    if (!hId) return res.status(400).json({ success:false, message:'Hospital required' })

    // Deduct from batch
    if (batch_id) {
      const batch = await MedicineBatch.findByPk(batch_id)
      if (!batch) return res.status(404).json({ success:false, message:'Batch not found' })
      if (batch.quantity < parseInt(quantity)) return res.status(400).json({ success:false, message:`Insufficient stock. Available: ${batch.quantity}` })
      const newQty = batch.quantity - parseInt(quantity)
      await batch.update({ quantity:newQty, status: newQty === 0 ? 'EXHAUSTED' : 'ACTIVE' })
    } else {
      // Deduct from oldest batch (FIFO)
      const batches = await MedicineBatch.findAll({
        where:{ medicine_id, hospital_id:hId, status:'ACTIVE', quantity:{ [Op.gt]:0 } },
        order:[['expiry_date','ASC']],
      })
      let remaining = parseInt(quantity)
      for (const b of batches) {
        if (remaining <= 0) break
        const deduct = Math.min(b.quantity, remaining)
        const newQty = b.quantity - deduct
        await b.update({ quantity:newQty, status: newQty===0 ? 'EXHAUSTED' : 'ACTIVE' })
        remaining -= deduct
      }
      if (remaining > 0) return res.status(400).json({ success:false, message:'Insufficient total stock' })
    }

    await StockMovement.create({
      medicine_id, batch_id:batch_id||null, hospital_id:hId,
      type: reference_type === 'PRESCRIPTION' ? 'DISPENSED' : 'OUT',
      quantity:parseInt(quantity), reference_id, reference_type, notes, performed_by:req.user.id,
    })

    res.json({ success:true, message:`${quantity} units removed from stock` })
  } catch (err) {
    console.error('Stock out error:', err)
    res.status(500).json({ success:false, message:'Failed to remove stock' })
  }
}

// ── POST /api/v1/pharmacy/transfer ──────────────────────────
export async function transfer(req, res) {
  try {
    const { medicine_id, from_hospital_id, to_hospital_id, quantity, batch_number, notes } = req.body
    if (!medicine_id || !from_hospital_id || !to_hospital_id || !quantity) {
      return res.status(400).json({ success:false, message:'All transfer fields are required' })
    }
    if (from_hospital_id === to_hospital_id) return res.status(400).json({ success:false, message:'Cannot transfer to same hospital' })

    // Deduct from source
    const sourceBatches = await MedicineBatch.findAll({
      where:{ medicine_id, hospital_id:from_hospital_id, status:'ACTIVE', quantity:{ [Op.gt]:0 },
              ...(batch_number ? { batch_number } : {}) },
      order:[['expiry_date','ASC']],
    })

    let remaining = parseInt(quantity)
    const transferred = []
    for (const b of sourceBatches) {
      if (remaining <= 0) break
      const deduct = Math.min(b.quantity, remaining)
      const newQty = b.quantity - deduct
      await b.update({ quantity:newQty, status: newQty===0 ? 'EXHAUSTED' : 'ACTIVE' })

      // Add to destination
      let destBatch = await MedicineBatch.findOne({ where:{ medicine_id, hospital_id:to_hospital_id, batch_number:b.batch_number } })
      if (destBatch) {
        await destBatch.update({ quantity: destBatch.quantity + deduct })
      } else {
        destBatch = await MedicineBatch.create({
          medicine_id, hospital_id:to_hospital_id, batch_number:b.batch_number,
          quantity:deduct, expiry_date:b.expiry_date, unit_price:b.unit_price,
          received_date:new Date().toISOString().split('T')[0],
          received_by:req.user.id, status:'ACTIVE',
        })
      }
      transferred.push({ batch_number:b.batch_number, quantity:deduct })
      remaining -= deduct
    }

    if (remaining > 0) return res.status(400).json({ success:false, message:'Insufficient stock for transfer' })

    // Log both movements
    await StockMovement.create({ medicine_id, hospital_id:from_hospital_id, type:'TRANSFER_OUT', quantity:parseInt(quantity), from_hospital:from_hospital_id, to_hospital:to_hospital_id, notes, performed_by:req.user.id })
    await StockMovement.create({ medicine_id, hospital_id:to_hospital_id,   type:'TRANSFER_IN',  quantity:parseInt(quantity), from_hospital:from_hospital_id, to_hospital:to_hospital_id, notes, performed_by:req.user.id })

    await createAuditLog({ userId:req.user.id, action:'MEDICINE_TRANSFER', tableName:'medicine_batches', newValues:{ medicine_id, from_hospital_id, to_hospital_id, quantity, transferred }, req })

    res.json({ success:true, message:`${quantity} units transferred successfully`, data:{ transferred } })
  } catch (err) {
    console.error('Transfer error:', err)
    res.status(500).json({ success:false, message:'Failed to transfer stock' })
  }
}

// ── GET /api/v1/pharmacy/batches ─────────────────────────────
export async function getBatches(req, res) {
  try {
    const { medicine_id, hospital_id, status } = req.query
    const where = {}
    if (medicine_id) where.medicine_id = medicine_id
    if (status)      where.status      = status
    const hId = req.user.role === 'HOSPITAL_ADMIN' ? req.user.hospital_id : (hospital_id || null)
    if (hId) where.hospital_id = hId

    const batches = await MedicineBatch.findAll({
      where,
      include:[
        { model:Medicine, as:'medicine', attributes:['id','name','unit'] },
        { model:Hospital, as:'hospital', attributes:['id','name'] },
      ],
      order:[['expiry_date','ASC']],
    })
    res.json({ success:true, data:batches })
  } catch (err) {
    res.status(500).json({ success:false, message:'Failed to fetch batches' })
  }
}

// ── GET /api/v1/pharmacy/movements ──────────────────────────
export async function getMovements(req, res) {
  try {
    const { page=1, limit=20, medicine_id='', hospital_id='', type='' } = req.query
    const where = {}
    if (medicine_id) where.medicine_id = medicine_id
    if (type)        where.type        = type
    const hId = req.user.role === 'HOSPITAL_ADMIN' ? req.user.hospital_id : (hospital_id || null)
    if (hId) where.hospital_id = hId

    const offset = (parseInt(page)-1)*parseInt(limit)
    const { count, rows } = await StockMovement.findAndCountAll({
      where,
      include:[
        { model:Medicine, as:'medicine', attributes:['id','name','unit'] },
        { model:User,     as:'performer', attributes:['id','name','role'], required:false },
      ],
      order:[['created_at','DESC']],
      limit:parseInt(limit), offset,
    })

    res.json({ success:true, data:{ movements:rows, pagination:{ total:count, page:parseInt(page), limit:parseInt(limit), pages:Math.ceil(count/parseInt(limit)) } } })
  } catch (err) {
    res.status(500).json({ success:false, message:'Failed to fetch movements' })
  }
}

// ── GET /api/v1/pharmacy/alerts ──────────────────────────────
export async function getAlerts(req, res) {
  try {
    const today = new Date()
    const in30Days = new Date(today); in30Days.setDate(today.getDate() + 30)
    const hId = req.user.hospital_id || null
    const where = { status:'ACTIVE', ...(hId ? { hospital_id:hId } : {}) }

    const [expiring, lowStock] = await Promise.all([
      MedicineBatch.findAll({
        where:{ ...where, expiry_date:{ [Op.lte]: in30Days.toISOString().split('T')[0] } },
        include:[{ model:Medicine, as:'medicine', attributes:['id','name','unit'] }, { model:Hospital, as:'hospital', attributes:['id','name'] }],
        order:[['expiry_date','ASC']],
        limit:50,
      }),
      // Low stock: join medicine to check min_stock_level
      MedicineBatch.findAll({
        where,
        include:[
          { model:Medicine, as:'medicine', attributes:['id','name','unit','min_stock_level'] },
          { model:Hospital, as:'hospital', attributes:['id','name'] },
        ],
      }).then(batches => {
        // Group by medicine+hospital
        const map = {}
        for (const b of batches) {
          if (!b.medicine) continue
          const key = `${b.medicine_id}_${b.hospital_id}`
          if (!map[key]) map[key] = { ...b.toJSON(), total_qty: 0 }
          map[key].total_qty += b.quantity
        }
        return Object.values(map).filter(i => i.total_qty <= (i.medicine?.min_stock_level || 10))
      }),
    ])

    res.json({ success:true, data:{ expiring, lowStock, total: expiring.length + lowStock.length } })
  } catch (err) {
    console.error('Alerts error:', err)
    res.status(500).json({ success:false, message:'Failed to fetch alerts' })
  }
}

// ── GET /api/v1/pharmacy/stats ───────────────────────────────
export async function getStats(req, res) {
  try {
    const today = new Date()
    const in30Days = new Date(today); in30Days.setDate(today.getDate() + 30)
    const hId = req.user.hospital_id || null
    const where = hId ? { hospital_id:hId } : {}

    const [totalMedicines, totalBatches, expiringBatches, lowStockCount] = await Promise.all([
      Medicine.count({ where:{ status:'ACTIVE' } }),
      MedicineBatch.count({ where:{ ...where, status:'ACTIVE' } }),
      MedicineBatch.count({ where:{ ...where, status:'ACTIVE', expiry_date:{ [Op.lte]: in30Days.toISOString().split('T')[0] } } }),
      MedicineBatch.findAll({ where:{ ...where, status:'ACTIVE' }, include:[{ model:Medicine, as:'medicine', attributes:['min_stock_level'] }] })
        .then(bs => {
          const map = {}
          for (const b of bs) { const k = `${b.medicine_id}_${b.hospital_id}`; if (!map[k]) map[k] = { qty:0, min:b.medicine?.min_stock_level||10 }; map[k].qty += b.quantity }
          return Object.values(map).filter(i => i.qty <= i.min).length
        }),
    ])

    res.json({ success:true, data:{ totalMedicines, totalBatches, expiringBatches, lowStockCount } })
  } catch (err) {
    res.status(500).json({ success:false, message:'Failed to fetch stats' })
  }
}

// ── GET /api/v1/pharmacy/hospitals/list ─────────────────────
export async function getHospitalsList(req, res) {
  try {
    const where = { status:'ACTIVE' }
    if (req.user.role === 'HOSPITAL_ADMIN') where.id = req.user.hospital_id
    const hospitals = await Hospital.findAll({ where, attributes:['id','name','code'], order:[['name','ASC']] })
    res.json({ success:true, data:hospitals })
  } catch (err) {
    res.status(500).json({ success:false, message:'Failed to fetch hospitals' })
  }
}
