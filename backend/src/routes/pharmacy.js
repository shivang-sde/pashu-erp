import { Router } from 'express'
import { verifySHA512 }            from '../middleware/verifySHA512.js'
import { authenticate, authorize } from '../middleware/auth.js'
import {
  listMedicines, createMedicine, updateMedicine,
  getStock, stockIn, stockOut, transfer,
  getBatches, getMovements, getAlerts, getStats,
  getHospitalsList,
} from '../controllers/pharmacyController.js'

const router = Router()

router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  verifySHA512(req, res, next)
})
router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  authenticate(req, res, next)
})

const ALL     = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','PHARMACIST']
const WRITE   = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','PHARMACIST']
const ADMIN   = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN']
const MED_MGR = ['STATE_ADMIN','DISTRICT_ADMIN']

router.get ('/stats',             authorize(...ALL),     getStats)
router.get ('/alerts',            authorize(...ALL),     getAlerts)
router.get ('/hospitals/list',    authorize(...ALL),     getHospitalsList)

// Medicine master
router.get ('/medicines',         authorize(...ALL),     listMedicines)
router.post('/medicines',         authorize(...MED_MGR), createMedicine)
router.put ('/medicines/:id',     authorize(...MED_MGR), updateMedicine)

// Stock
router.get ('/stock',             authorize(...ALL),     getStock)
router.get ('/batches',           authorize(...ALL),     getBatches)
router.get ('/movements',         authorize(...ALL),     getMovements)
router.post('/stock-in',          authorize(...WRITE),   stockIn)
router.post('/stock-out',         authorize(...WRITE),   stockOut)
router.post('/transfer',          authorize(...ADMIN),   transfer)

export default router
