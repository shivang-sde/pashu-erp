import { Router } from 'express'
import { verifySHA512 }            from '../middleware/verifySHA512.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { list, getOne, create, update, sendEmail } from '../controllers/prescriptionController.js'

const router = Router()

router.use((req, res, next) => { if (req.method === 'OPTIONS') return next(); verifySHA512(req, res, next) })
router.use((req, res, next) => { if (req.method === 'OPTIONS') return next(); authenticate(req, res, next) })

const ALL    = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','RECEPTIONIST']
const WRITE  = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR']

router.get ('/',                   authorize(...ALL),   list)
router.get ('/:id',                authorize(...ALL),   getOne)
router.post('/',                   authorize(...WRITE), create)
router.put ('/:id',                authorize(...WRITE), update)
router.post('/:id/send-email',     authorize(...WRITE), sendEmail)

export default router
