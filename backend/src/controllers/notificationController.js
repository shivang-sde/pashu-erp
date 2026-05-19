import { Op } from 'sequelize'
import {
  MedicineBatch, Medicine, InventoryStock, InventoryItem,
  VaccinationRecord, Animal, Appointment, Hospital, User, Bill,
} from '../models/index.js'

// ── In-memory SSE client store ────────────────────────────────
const clients = new Map() // userId -> res

export function addClient(userId, res) {
  clients.set(userId, res)
}
export function removeClient(userId) {
  clients.delete(userId)
}
export function sendToUser(userId, data) {
  const res = clients.get(userId)
  if (res) res.write(`data: ${JSON.stringify(data)}\n\n`)
}
export function broadcast(data) {
  clients.forEach(res => res.write(`data: ${JSON.stringify(data)}\n\n`))
}

// ── Build notifications for a user ───────────────────────────
async function buildNotifications(user) {
  const notes = []
  const today   = new Date().toISOString().split('T')[0]
  const in7Days = new Date(); in7Days.setDate(in7Days.getDate()+7)
  const in30Days= new Date(); in30Days.setDate(in30Days.getDate()+30)
  const hId = user.hospital_id || null

  const baseWhere = hId ? { hospital_id: hId } : {}

  try {
    // 1. Low medicine stock
    const batches = await MedicineBatch.findAll({
      where: { ...baseWhere, status: 'ACTIVE' },
      include: [{ model: Medicine, as: 'medicine', attributes: ['id','name','min_stock_level'] }],
    })
    const medMap = {}
    batches.forEach(b => {
      const k = `${b.medicine_id}_${b.hospital_id}`
      if (!medMap[k]) medMap[k] = { name: b.medicine?.name, qty: 0, min: b.medicine?.min_stock_level||10, hId: b.hospital_id }
      medMap[k].qty += b.quantity
    })
    Object.values(medMap).forEach(m => {
      if (m.qty <= m.min) {
        notes.push({
          id:       `low-med-${m.name}`,
          type:     'LOW_STOCK',
          severity: m.qty === 0 ? 'critical' : 'warning',
          title:    'Low Medicine Stock',
          message:  `${m.name} has only ${m.qty} units left (min: ${m.min})`,
          icon:     '💊',
          link:     '/dashboard/pharmacy',
        })
      }
    })

    // 2. Expiring medicines (within 7 days = critical, 30 days = warning)
    const expiring = await MedicineBatch.findAll({
      where: {
        ...baseWhere,
        status: 'ACTIVE',
        expiry_date: { [Op.lte]: in30Days.toISOString().split('T')[0], [Op.gte]: today },
      },
      include: [{ model: Medicine, as: 'medicine', attributes: ['name'] }],
      limit: 5,
    })
    expiring.forEach(b => {
      const days = Math.ceil((new Date(b.expiry_date)-new Date(today))/(86400000))
      notes.push({
        id:       `exp-med-${b.id}`,
        type:     'EXPIRING_MEDICINE',
        severity: days <= 7 ? 'critical' : 'warning',
        title:    'Medicine Expiring Soon',
        message:  `${b.medicine?.name} (Batch ${b.batch_number}) expires in ${days} day${days===1?'':'s'}`,
        icon:     '⚠️',
        link:     '/dashboard/pharmacy',
      })
    })

    // 3. Low inventory stock
    const invStocks = await InventoryStock.findAll({
      where: baseWhere,
      include: [{ model: InventoryItem, as: 'item', attributes: ['name','min_stock_level'] }],
    })
    invStocks.filter(s => s.quantity <= (s.item?.min_stock_level||5)).slice(0,3).forEach(s => {
      notes.push({
        id:       `low-inv-${s.id}`,
        type:     'LOW_INVENTORY',
        severity: s.quantity === 0 ? 'critical' : 'warning',
        title:    'Low Inventory Stock',
        message:  `${s.item?.name} has only ${s.quantity} units left`,
        icon:     '📦',
        link:     '/dashboard/inventory',
      })
    })

    // 4. Overdue vaccinations
    const overdueVacc = await VaccinationRecord.count({
      where: { ...baseWhere, next_due_at: { [Op.lt]: today } },
    })
    if (overdueVacc > 0) {
      notes.push({
        id:       'overdue-vacc',
        type:     'OVERDUE_VACCINATION',
        severity: 'warning',
        title:    'Overdue Vaccinations',
        message:  `${overdueVacc} animal${overdueVacc>1?'s have':' has'} overdue vaccination${overdueVacc>1?'s':''}`,
        icon:     '💉',
        link:     '/dashboard/patients',
      })
    }

    // 5. Today's pending appointments
    const pendingAppts = await Appointment.count({
      where: { ...baseWhere, appointment_date: today, status: 'PENDING' },
    })
    if (pendingAppts > 0) {
      notes.push({
        id:       'pending-appts',
        type:     'PENDING_APPOINTMENTS',
        severity: 'info',
        title:    "Today's Pending Appointments",
        message:  `${pendingAppts} appointment${pendingAppts>1?'s':''} pending today`,
        icon:     '📅',
        link:     '/dashboard/appointments',
      })
    }

    // 6. Emergency appointments today
    const emergencyAppts = await Appointment.count({
      where: { ...baseWhere, appointment_date: today, type: 'EMERGENCY', status: { [Op.in]: ['PENDING','CONFIRMED'] } },
    })
    if (emergencyAppts > 0) {
      notes.push({
        id:       'emergency-appts',
        type:     'EMERGENCY_APPOINTMENT',
        severity: 'critical',
        title:    'Emergency Appointments',
        message:  `${emergencyAppts} emergency appointment${emergencyAppts>1?'s':''} need immediate attention`,
        icon:     '🚨',
        link:     '/dashboard/appointments',
      })
    }

    // 7. Pending bills (hospital admin only)
    if (['HOSPITAL_ADMIN','RECEPTIONIST'].includes(user.role)) {
      const pendingBills = await Bill.count({
        where: { ...baseWhere, status: 'PENDING' },
      })
      if (pendingBills > 0) {
        notes.push({
          id:       'pending-bills',
          type:     'PENDING_BILLS',
          severity: 'info',
          title:    'Pending Bills',
          message:  `${pendingBills} bill${pendingBills>1?'s':''} awaiting payment`,
          icon:     '🧾',
          link:     '/dashboard/billing',
        })
      }
    }

    // 8. Vaccinations due within 7 days
    const dueSoon = await VaccinationRecord.count({
      where: { ...baseWhere, next_due_at: { [Op.gte]: today, [Op.lte]: in7Days.toISOString().split('T')[0] } },
    })
    if (dueSoon > 0) {
      notes.push({
        id:       'due-vacc-soon',
        type:     'VACCINATION_DUE',
        severity: 'info',
        title:    'Vaccinations Due Soon',
        message:  `${dueSoon} vaccination${dueSoon>1?'s':''} due within 7 days`,
        icon:     '💉',
        link:     '/dashboard/patients',
      })
    }

  } catch (err) {
    console.error('Notification build error:', err)
  }

  // Sort: critical first, then warning, then info
  const ORDER = { critical:0, warning:1, info:2 }
  return notes.sort((a,b) => ORDER[a.severity]-ORDER[b.severity])
}

// ── GET /api/v1/notifications ────────────────────────────────
export async function getNotifications(req, res) {
  try {
    const notes = await buildNotifications(req.user)
    res.json({ success:true, data: notes, count: notes.length })
  } catch (err) {
    res.status(500).json({ success:false, message:'Failed to fetch notifications' })
  }
}

// ── GET /api/v1/notifications/stream (SSE) ───────────────────
export async function streamNotifications(req, res) {
  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const userId = req.user.id
  addClient(userId, res)

  // Send initial notifications
  try {
    const notes = await buildNotifications(req.user)
    res.write(`data: ${JSON.stringify({ type:'INIT', notifications: notes, count: notes.length })}\n\n`)
  } catch {}

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`)
  }, 30000)

  // Re-send notifications every 2 minutes
  const refresh = setInterval(async () => {
    try {
      const notes = await buildNotifications(req.user)
      res.write(`data: ${JSON.stringify({ type:'REFRESH', notifications: notes, count: notes.length })}\n\n`)
    } catch {}
  }, 120000)

  req.on('close', () => {
    clearInterval(heartbeat)
    clearInterval(refresh)
    removeClient(userId)
  })
}
