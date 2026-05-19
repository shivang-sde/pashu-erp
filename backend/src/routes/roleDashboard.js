import { Router } from 'express'
import { verifySHA512 }            from '../middleware/verifySHA512.js'
import { authenticate, authorize } from '../middleware/auth.js'
import {
  doctorDashboard, hospitalAdminDashboard,
  receptionistDashboard, pharmacistDashboard,
} from '../controllers/roleDashboardController.js'

const router = Router()

router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  verifySHA512(req, res, next)
})
router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  authenticate(req, res, next)
})

router.get('/doctor',         authorize('DOCTOR'),         doctorDashboard)
router.get('/hospital-admin', authorize('HOSPITAL_ADMIN'), hospitalAdminDashboard)
router.get('/receptionist',   authorize('RECEPTIONIST'),   receptionistDashboard)
router.get('/pharmacist',     authorize('PHARMACIST'),     pharmacistDashboard)

export default router
