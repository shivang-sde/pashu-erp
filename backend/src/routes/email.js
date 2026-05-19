import { Router } from 'express'
import { verifySHA512 }            from '../middleware/verifySHA512.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { testEmail, sendBill, sendAppointment, emailStatus } from '../controllers/emailController.js'

const router = Router()

router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  verifySHA512(req, res, next)
})
router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  authenticate(req, res, next)
})

const ADMINS = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN']
const ALL    = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','PHARMACIST','RECEPTIONIST']

router.get ('/status',                    authorize(...ADMINS), emailStatus)
router.post('/test',                      authorize(...ADMINS), testEmail)
router.post('/send-bill/:billId',         authorize(...ALL),    sendBill)
router.post('/send-appointment/:apptId',  authorize(...ALL),    sendAppointment)

export default router
