import { Router } from 'express'
import { verifySHA512 }            from '../middleware/verifySHA512.js'
import { authenticate, authorize } from '../middleware/auth.js'
import {
  list, getOne, create, pay, cancel, getStats,
  searchOwners, getOwnerAnimals, getHospitalsList,
} from '../controllers/billingController.js'

const router = Router()

router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  verifySHA512(req, res, next)
})
router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  authenticate(req, res, next)
})

const ALL   = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','RECEPTIONIST','PHARMACIST']
const WRITE = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','RECEPTIONIST']
const ADMIN = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN']

// Static routes first
router.get ('/stats',               authorize(...ALL),   getStats)
router.get ('/hospitals/list',      authorize(...ALL),   getHospitalsList)
router.get ('/owners/search',       authorize(...ALL),   searchOwners)
router.get ('/owners/:id/animals',  authorize(...ALL),   getOwnerAnimals)

router.get ('/',         authorize(...ALL),   list)
router.get ('/:id',      authorize(...ALL),   getOne)
router.post('/',         authorize(...WRITE), create)
router.post('/:id/pay',  authorize(...WRITE), pay)
router.post('/:id/cancel', authorize(...ADMIN), cancel)

export default router
