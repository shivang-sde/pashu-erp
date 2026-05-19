import express from 'express'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
dotenv.config()

import { connectDB }      from './config/database.js'
import authRoutes         from './routes/auth.js'
import dashboardRoutes    from './routes/dashboardRoute.js'
import hospitalRoutes     from './routes/hospitals.js'
import doctorRoutes       from './routes/doctors.js'
import animalRoutes       from './routes/animals.js'
import appointmentRoutes  from './routes/appointments.js'
import pharmacyRoutes     from './routes/pharmacy.js'
import inventoryRoutes    from './routes/inventory.js'
import billingRoutes      from './routes/billing.js'
import reportsRoutes     from './routes/reports.js'
import userRoutes        from './routes/users.js'
import bulkRoutes        from './routes/bulk.js'
import printRoutes       from './routes/print.js'
import roleDashRoutes    from './routes/roleDashboard.js'
import notifRoutes       from './routes/notifications.js'
import emailRoutes        from './routes/email.js'
import prescriptionRoutes from './routes/prescriptions.js'

const app  = express()
const PORT = process.env.PORT || 5000
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173'

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin',      FRONTEND)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods',     'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers',     'Content-Type, Authorization, X-Signature, X-Timestamp')
  res.setHeader('Access-Control-Max-Age',           '86400')
  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  next()
})

app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => { req._rawBody = buf.toString('utf8') }
}))
app.use(express.urlencoded({ extended: true }))
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'))

const globalLimiter = rateLimit({ windowMs:15*60*1000, max:300, standardHeaders:true, legacyHeaders:false })
const authLimiter   = rateLimit({ windowMs:15*60*1000, max:20, message:{ success:false, message:'Too many login attempts.' } })
app.use('/api',               globalLimiter)
app.use('/api/v1/auth/login', authLimiter)

app.use('/api/v1/auth',         authRoutes)
app.use('/api/v1/dashboard',    dashboardRoutes)
app.use('/api/v1/hospitals',    hospitalRoutes)
app.use('/api/v1/doctors',      doctorRoutes)
app.use('/api/v1/animals',      animalRoutes)
app.use('/api/v1/appointments', appointmentRoutes)
app.use('/api/v1/pharmacy',     pharmacyRoutes)
app.use('/api/v1/inventory',    inventoryRoutes)
app.use('/api/v1/billing',      billingRoutes)
app.use('/api/v1/reports',      reportsRoutes)
app.use('/api/v1/users',        userRoutes)
app.use('/api/v1/bulk',         bulkRoutes)
app.use('/api/v1/print',        printRoutes)
app.use('/api/v1/role-dashboard',roleDashRoutes)
app.use('/api/v1/notifications',  notifRoutes)
app.use('/api/v1/email',           emailRoutes)
app.use('/api/v1/prescriptions',   prescriptionRoutes)

app.get('/health', (req, res) => res.json({ success:true, message:'PashuCare ERP API running', version:'1.0.0', time:new Date().toISOString() }))
app.use((req, res) => res.status(404).json({ success:false, message:`${req.method} ${req.path} not found` }))
app.use((err, req, res, next) => { console.error('Unhandled:', err); res.status(500).json({ success:false, message:'Internal server error' }) })

async function start() {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`\n🚀 PashuCare ERP API  →  http://localhost:${PORT}`)
    console.log(`✅ CORS: ${FRONTEND}`)
    console.log(`🔐 SHA-512: ${process.env.SKIP_SIGNATURE === 'true' ? '⚠️ DISABLED' : '✅ enabled'}\n`)
  })
}
start()
