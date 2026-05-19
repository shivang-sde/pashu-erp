import { Router } from 'express'
import { verifySHA512 }            from '../middleware/verifySHA512.js'
import { authenticate, authorize } from '../middleware/auth.js'
import {
  listItems, createItem, updateItem,
  getStock, stockIn, stockOut, transfer,
  getMovements, getAlerts, getStats, getHospitalsList,
} from '../controllers/inventoryController.js'

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
const WRITE = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','PHARMACIST']
const ADMIN = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN']
const MGR   = ['STATE_ADMIN','DISTRICT_ADMIN']

router.get ('/stats',          authorize(...ALL),   getStats)
router.get ('/alerts',         authorize(...ALL),   getAlerts)
router.get ('/hospitals/list', authorize(...ALL),   getHospitalsList)

router.get ('/items',          authorize(...ALL),   listItems)
router.post('/items',          authorize(...MGR),   createItem)
router.put ('/items/:id',      authorize(...MGR),   updateItem)

router.get ('/stock',          authorize(...ALL),   getStock)
router.get ('/movements',      authorize(...ALL),   getMovements)
router.post('/stock-in',       authorize(...WRITE), stockIn)
router.post('/stock-out',      authorize(...WRITE), stockOut)
router.post('/transfer',       authorize(...ADMIN), transfer)

export default router
