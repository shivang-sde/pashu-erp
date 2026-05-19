import { Router } from 'express'
import { verifySHA512 }   from '../middleware/verifySHA512.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { list, getOne, create, update, remove, getAllDistricts } from '../controllers/hospitalController.js'
import { getHospitalDetail } from '../controllers/hospitalDetailController.js'

const router = Router()

router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  verifySHA512(req, res, next)
})
router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  authenticate(req, res, next)
})

const ADMINS = ['STATE_ADMIN', 'DISTRICT_ADMIN', 'HOSPITAL_ADMIN']

router.get ('/',                authorize(...ADMINS),                           list)
router.get ('/districts/all',   authorize(...ADMINS),                           getAllDistricts)
router.get ('/:id/detail',      authorize(...ADMINS),                           getHospitalDetail)
router.get ('/:id',             authorize(...ADMINS),                           getOne)
router.post('/',                authorize('STATE_ADMIN', 'DISTRICT_ADMIN'),     create)
router.put ('/:id',             authorize('STATE_ADMIN', 'DISTRICT_ADMIN'),     update)
router.delete('/:id',           authorize('STATE_ADMIN'),                       remove)

export default router
