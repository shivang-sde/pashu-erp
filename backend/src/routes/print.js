import { Router } from 'express'
import { verifySHA512 }            from '../middleware/verifySHA512.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { billingSummary, stockReport, appointmentQueue } from '../controllers/printController.js'

const router = Router()

router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  verifySHA512(req, res, next)
})
router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  authenticate(req, res, next)
})

const ALL = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','PHARMACIST','RECEPTIONIST']

router.get('/billing-summary',    authorize(...ALL), billingSummary)
router.get('/stock-report',       authorize(...ALL), stockReport)
router.get('/appointment-queue',  authorize(...ALL), appointmentQueue)

export default router
