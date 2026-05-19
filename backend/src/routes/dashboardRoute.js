import { Router } from 'express'
import { verifySHA512 } from '../middleware/verifySHA512.js'
import { authenticate, authorize } from '../middleware/auth.js'
import {
  getStats,
  getHospitals,
  getUserRoles,
  getDistrictSummary,
  getRecentActivity,
} from '../controllers/dashboardController.js'

const router = Router()

// All dashboard routes require valid JWT + SHA-512
router.use(verifySHA512)
router.use(authenticate)

// State Admin + District Admin can see dashboard
const admins = ['STATE_ADMIN', 'DISTRICT_ADMIN']

router.get('/stats',            authorize(...admins), getStats)
router.get('/hospitals',        authorize(...admins, 'HOSPITAL_ADMIN'), getHospitals)
router.get('/user-roles',       authorize(...admins), getUserRoles)
router.get('/district-summary', authorize('STATE_ADMIN','DISTRICT_ADMIN'), getDistrictSummary)
router.get('/recent-activity',  authorize('STATE_ADMIN','DISTRICT_ADMIN'), getRecentActivity)

export default router
