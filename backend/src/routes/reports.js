import { Router } from 'express'
import { verifySHA512 }            from '../middleware/verifySHA512.js'
import { authenticate, authorize } from '../middleware/auth.js'
import {
  overview, appointmentsByMonth, revenueByMonth,
  animalsByType, diseaseAnalysis, medicineConsumption,
  billingByType, hospitalPerformance, vaccinationSummary,
  paymentModeBreakdown,
} from '../controllers/reportsController.js'

const router = Router()

router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  verifySHA512(req, res, next)
})
router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  authenticate(req, res, next)
})

const ALL   = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','PHARMACIST']
const ADMIN = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN']

router.get('/overview',              authorize(...ALL),   overview)
router.get('/appointments-by-month', authorize(...ALL),   appointmentsByMonth)
router.get('/revenue-by-month',      authorize(...ADMIN), revenueByMonth)
router.get('/animals-by-type',       authorize(...ALL),   animalsByType)
router.get('/disease-analysis',      authorize(...ALL),   diseaseAnalysis)
router.get('/medicine-consumption',  authorize(...ALL),   medicineConsumption)
router.get('/billing-by-type',       authorize(...ADMIN), billingByType)
router.get('/hospital-performance',  authorize('STATE_ADMIN','DISTRICT_ADMIN'), hospitalPerformance)
router.get('/vaccination-summary',   authorize(...ALL),   vaccinationSummary)
router.get('/payment-mode-breakdown',authorize(...ADMIN), paymentModeBreakdown)

export default router
