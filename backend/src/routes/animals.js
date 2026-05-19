import { Router } from 'express'
import { verifySHA512 }          from '../middleware/verifySHA512.js'
import { authenticate, authorize } from '../middleware/auth.js'
import {
  list, getOne, create, update, remove,
  addDisease, addVaccination, getStats,
} from '../controllers/animalController.js'
import { getAnimalHistory } from '../controllers/animalHistoryController.js'

const router = Router()
router.use(verifySHA512)
router.use(authenticate)

const ALL = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','RECEPTIONIST']
const WRITE = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','RECEPTIONIST']
const ADMIN = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN']

router.get  ('/stats',              authorize(...ADMIN), getStats)
router.get  ('/',                   authorize(...ALL),   list)
router.get  ('/:id',                authorize(...ALL),   getOne)
router.post ('/',                   authorize(...WRITE), create)
router.put  ('/:id',                authorize(...WRITE), update)
router.delete('/:id',               authorize(...ADMIN), remove)
router.get  ('/:id/history',        authorize(...ALL),   getAnimalHistory)
router.post ('/:id/diseases',       authorize(...WRITE), addDisease)
router.post ('/:id/vaccinations',   authorize(...WRITE), addVaccination)

export default router
