import { Op, fn, col } from 'sequelize'
import { InventoryItem, InventoryStock, InventoryMovement, Hospital, User } from '../models/index.js'
import { createAuditLog } from '../middleware/auditLog.js'

// ── GET /api/v1/inventory/items ─────────────────────────────
export async function listItems(req, res) {
  try {
    const { page=1, limit=10, search='', category='', status='' } = req.query
    const where = {}
    if (search)   where[Op.or] = [{ name:{[Op.like]:`%${search}%`} }, { code:{[Op.like]:`%${search}%`} }]
    if (category) where.category = category
    if (status)   where.status   = status

    const offset = (parseInt(page)-1)*parseInt(limit)
    const { count, rows } = await InventoryItem.findAndCountAll({
      where, order:[['name','ASC']], limit:parseInt(limit), offset,
    })
    res.json({ success:true, data:{ items:rows, pagination:{ total:count, page:parseInt(page), limit:parseInt(limit), pages:Math.ceil(count/parseInt(limit)) } } })
  } catch (err) {
    console.error('Inventory list error:', err)
    res.status(500).json({ success:false, message:'Failed to fetch inventory items' })
  }
}

// ── POST /api/v1/inventory/items ────────────────────────────
export async function createItem(req, res) {
  try {
    const { name, code, category, unit, description, min_stock_level, manufacturer } = req.body
    if (!name || !category) return res.status(400).json({ success:false, message:'Name and category are required' })

    if (code) {
      const exists = await InventoryItem.findOne({ where:{ code } })
      if (exists) return res.status(409).json({ success:false, message:'Item code already exists' })
    }

    const item = await InventoryItem.create({ name, code, category, unit, description, min_stock_level, manufacturer })
    await createAuditLog({ userId:req.user.id, action:'CREATE_INVENTORY_ITEM', tableName:'inventory_items', recordId:item.id, newValues:req.body, req })
    res.status(201).json({ success:true, data:item, message:'Item created' })
  } catch (err) {
    console.error('Inventory create error:', err)
    res.status(500).json({ success:false, message:'Failed to create item' })
  }
}

// ── PUT /api/v1/inventory/items/:id ─────────────────────────
export async function updateItem(req, res) {
  try {
    const item = await InventoryItem.findByPk(req.params.id)
    if (!item) return res.status(404).json({ success:false, message:'Item not found' })
    const old = item.toJSON()
    await item.update(req.body)
    await createAuditLog({ userId:req.user.id, action:'UPDATE_INVENTORY_ITEM', tableName:'inventory_items', recordId:item.id, oldValues:old, newValues:req.body, req })
    res.json({ success:true, data:item, message:'Item updated' })
  } catch (err) {
    res.status(500).json({ success:false, message:'Failed to update item' })
  }
}

// ── GET /api/v1/inventory/stock ─────────────────────────────
export async function getStock(req, res) {
  try {
    const { page=1, limit=10, search='', hospital_id='', category='', low_stock='' } = req.query
    const today = new Date().toISOString().split('T')[0]
    const hId = req.user.role === 'HOSPITAL_ADMIN' ? req.user.hospital_id : (hospital_id || null)

    const stockWhere = { quantity:{ [Op.gte]:0 } }
    if (hId) stockWhere.hospital_id = hId

    const itemWhere = {}
    if (category) itemWhere.category = category
    if (search)   itemWhere[Op.or] = [{ name:{[Op.like]:`%${search}%`} }, { code:{[Op.like]:`%${search}%`} }]

    const stocks = await InventoryStock.findAll({
      where: stockWhere,
      include: [
        { model:InventoryItem, as:'item', where: itemWhere, attributes:['id','name','code','category','unit','min_stock_level','manufacturer'] },
        { model:Hospital, as:'hospital', attributes:['id','name','code'] },
      ],
      order:[['updated_at','DESC']],
    })

    let items = stocks
    if (low_stock === 'true') {
      items = stocks.filter(s => s.quantity <= (s.item?.min_stock_level || 5))
    }

    // Expiry flag
    const result = items.map(s => ({
      ...s.toJSON(),
      is_low:           s.quantity <= (s.item?.min_stock_level || 5),
      is_expiring_soon: s.expiry_date && Math.ceil((new Date(s.expiry_date)-new Date(today))/(86400000)) <= 30,
      is_expired:       s.expiry_date && new Date(s.expiry_date) < new Date(today),
      days_to_expiry:   s.expiry_date ? Math.ceil((new Date(s.expiry_date)-new Date(today))/(86400000)) : null,
    }))

    const total  = result.length
    const offset = (parseInt(page)-1)*parseInt(limit)
    const paged  = result.slice(offset, offset+parseInt(limit))

    res.json({ success:true, data:{ stock:paged, pagination:{ total, page:parseInt(page), limit:parseInt(limit), pages:Math.ceil(total/parseInt(limit)) } } })
  } catch (err) {
    console.error('Stock fetch error:', err)
    res.status(500).json({ success:false, message:'Failed to fetch stock' })
  }
}

// ── POST /api/v1/inventory/stock-in ─────────────────────────
export async function stockIn(req, res) {
  try {
    const { item_id, hospital_id, quantity, batch_number, expiry_date, unit_cost, supplier, notes } = req.body
    if (!item_id || !quantity) return res.status(400).json({ success:false, message:'Item and quantity are required' })

    const hId = req.user.role === 'HOSPITAL_ADMIN' ? req.user.hospital_id : (hospital_id || req.user.hospital_id)
    if (!hId) return res.status(400).json({ success:false, message:'Hospital required' })

    // Upsert stock record
    let stock = await InventoryStock.findOne({ where:{ item_id, hospital_id:hId } })
    if (stock) {
      await stock.update({ quantity: stock.quantity + parseInt(quantity), batch_number:batch_number||stock.batch_number, expiry_date:expiry_date||stock.expiry_date, unit_cost:unit_cost||stock.unit_cost, supplier:supplier||stock.supplier })
    } else {
      stock = await InventoryStock.create({ item_id, hospital_id:hId, quantity:parseInt(quantity), batch_number, expiry_date, unit_cost, supplier })
    }

    // Movement log
    await InventoryMovement.create({ item_id, stock_id:stock.id, hospital_id:hId, type:'IN', quantity:parseInt(quantity), batch_number, unit_cost, supplier, notes, performed_by:req.user.id })

    await createAuditLog({ userId:req.user.id, action:'INVENTORY_STOCK_IN', tableName:'inventory_stock', recordId:stock.id, newValues:{ item_id, quantity, batch_number }, req })
    res.status(201).json({ success:true, data:stock, message:`${quantity} units added to inventory` })
  } catch (err) {
    console.error('Inventory stock-in error:', err)
    res.status(500).json({ success:false, message:'Failed to add inventory stock' })
  }
}

// ── POST /api/v1/inventory/stock-out ────────────────────────
export async function stockOut(req, res) {
  try {
    const { item_id, hospital_id, quantity, notes, reference_id, reference_type } = req.body
    if (!item_id || !quantity) return res.status(400).json({ success:false, message:'Item and quantity are required' })

    const hId = req.user.role === 'HOSPITAL_ADMIN' ? req.user.hospital_id : (hospital_id || req.user.hospital_id)
    const stock = await InventoryStock.findOne({ where:{ item_id, hospital_id:hId } })
    if (!stock) return res.status(404).json({ success:false, message:'No stock found for this item at this hospital' })
    if (stock.quantity < parseInt(quantity)) return res.status(400).json({ success:false, message:`Insufficient stock. Available: ${stock.quantity}` })

    await stock.update({ quantity: stock.quantity - parseInt(quantity) })
    await InventoryMovement.create({ item_id, stock_id:stock.id, hospital_id:hId, type:'OUT', quantity:parseInt(quantity), notes, reference_id, reference_type, performed_by:req.user.id })

    res.json({ success:true, message:`${quantity} units removed from inventory` })
  } catch (err) {
    console.error('Inventory stock-out error:', err)
    res.status(500).json({ success:false, message:'Failed to remove inventory stock' })
  }
}

// ── POST /api/v1/inventory/transfer ─────────────────────────
export async function transfer(req, res) {
  try {
    const { item_id, from_hospital_id, to_hospital_id, quantity, notes } = req.body
    if (!item_id || !from_hospital_id || !to_hospital_id || !quantity) {
      return res.status(400).json({ success:false, message:'All transfer fields required' })
    }
    if (from_hospital_id === to_hospital_id) return res.status(400).json({ success:false, message:'Cannot transfer to same hospital' })

    const srcStock = await InventoryStock.findOne({ where:{ item_id, hospital_id:from_hospital_id } })
    if (!srcStock || srcStock.quantity < parseInt(quantity)) {
      return res.status(400).json({ success:false, message:`Insufficient stock. Available: ${srcStock?.quantity||0}` })
    }

    await srcStock.update({ quantity: srcStock.quantity - parseInt(quantity) })

    let dstStock = await InventoryStock.findOne({ where:{ item_id, hospital_id:to_hospital_id } })
    if (dstStock) {
      await dstStock.update({ quantity: dstStock.quantity + parseInt(quantity) })
    } else {
      dstStock = await InventoryStock.create({ item_id, hospital_id:to_hospital_id, quantity:parseInt(quantity), expiry_date:srcStock.expiry_date, unit_cost:srcStock.unit_cost })
    }

    await Promise.all([
      InventoryMovement.create({ item_id, stock_id:srcStock.id, hospital_id:from_hospital_id, type:'TRANSFER_OUT', quantity:parseInt(quantity), from_hospital:from_hospital_id, to_hospital:to_hospital_id, notes, performed_by:req.user.id }),
      InventoryMovement.create({ item_id, stock_id:dstStock.id, hospital_id:to_hospital_id,   type:'TRANSFER_IN',  quantity:parseInt(quantity), from_hospital:from_hospital_id, to_hospital:to_hospital_id, notes, performed_by:req.user.id }),
    ])

    await createAuditLog({ userId:req.user.id, action:'INVENTORY_TRANSFER', tableName:'inventory_stock', newValues:{ item_id, from_hospital_id, to_hospital_id, quantity }, req })
    res.json({ success:true, message:`${quantity} units transferred successfully` })
  } catch (err) {
    console.error('Inventory transfer error:', err)
    res.status(500).json({ success:false, message:'Failed to transfer inventory' })
  }
}

// ── GET /api/v1/inventory/movements ─────────────────────────
export async function getMovements(req, res) {
  try {
    const { page=1, limit=15, item_id='', hospital_id='', type='' } = req.query
    const where = {}
    if (item_id)  where.item_id     = item_id
    if (type)     where.type        = type
    const hId = req.user.role === 'HOSPITAL_ADMIN' ? req.user.hospital_id : (hospital_id || null)
    if (hId) where.hospital_id = hId

    const offset = (parseInt(page)-1)*parseInt(limit)
    const { count, rows } = await InventoryMovement.findAndCountAll({
      where,
      include:[
        { model:InventoryItem, as:'item',      attributes:['id','name','code','unit','category'] },
        { model:User,          as:'performer', attributes:['id','name','role'], required:false },
      ],
      order:[['created_at','DESC']],
      limit:parseInt(limit), offset,
    })

    res.json({ success:true, data:{ movements:rows, pagination:{ total:count, page:parseInt(page), limit:parseInt(limit), pages:Math.ceil(count/parseInt(limit)) } } })
  } catch (err) {
    res.status(500).json({ success:false, message:'Failed to fetch movements' })
  }
}

// ── GET /api/v1/inventory/alerts ────────────────────────────
export async function getAlerts(req, res) {
  try {
    const today    = new Date()
    const in30Days = new Date(today); in30Days.setDate(today.getDate()+30)
    const hId = req.user.hospital_id || null
    const where = hId ? { hospital_id:hId } : {}

    const allStock = await InventoryStock.findAll({
      where,
      include:[
        { model:InventoryItem, as:'item', attributes:['id','name','code','category','unit','min_stock_level'] },
        { model:Hospital,      as:'hospital', attributes:['id','name'] },
      ],
    })

    const expiring = allStock.filter(s => s.expiry_date && new Date(s.expiry_date) <= in30Days)
      .map(s => ({
        ...s.toJSON(),
        days_to_expiry: Math.ceil((new Date(s.expiry_date)-today)/(86400000)),
      }))
      .sort((a,b) => a.days_to_expiry - b.days_to_expiry)

    const lowStock = allStock.filter(s => s.quantity <= (s.item?.min_stock_level || 5))

    res.json({ success:true, data:{ expiring, lowStock, total: expiring.length + lowStock.length } })
  } catch (err) {
    res.status(500).json({ success:false, message:'Failed to fetch alerts' })
  }
}

// ── GET /api/v1/inventory/stats ──────────────────────────────
export async function getStats(req, res) {
  try {
    const today    = new Date()
    const in30Days = new Date(today); in30Days.setDate(today.getDate()+30)
    const hId = req.user.hospital_id || null
    const where = hId ? { hospital_id:hId } : {}

    const [totalItems, allStock] = await Promise.all([
      InventoryItem.count({ where:{ status:'ACTIVE' } }),
      InventoryStock.findAll({ where, include:[{ model:InventoryItem, as:'item', attributes:['min_stock_level'] }] }),
    ])

    const expiringCount = allStock.filter(s => s.expiry_date && new Date(s.expiry_date) <= in30Days).length
    const lowStockCount = allStock.filter(s => s.quantity <= (s.item?.min_stock_level || 5)).length
    const totalStock    = allStock.reduce((sum,s) => sum + s.quantity, 0)

    res.json({ success:true, data:{ totalItems, totalStock, expiringCount, lowStockCount } })
  } catch (err) {
    res.status(500).json({ success:false, message:'Failed to fetch stats' })
  }
}

// ── GET /api/v1/inventory/hospitals/list ────────────────────
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
