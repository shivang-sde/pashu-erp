import { Router } from 'express'
import { verifySHA512 }            from '../middleware/verifySHA512.js'
import { authenticate, authorize } from '../middleware/auth.js'
import {
  list, today, stats, getOne, create, update,
  updateStatus, assignDoctor, remove, getAvailableDoctors,
} from '../controllers/appointmentController.js'

const router = Router()

const ALL   = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','RECEPTIONIST']
const WRITE = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','RECEPTIONIST']
const ADMIN = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN']

// Skip verifySHA512 + authenticate for OPTIONS preflight
router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  verifySHA512(req, res, next)
})
router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  authenticate(req, res, next)
})

// Static routes FIRST
router.get('/today',             authorize(...ALL),   today)
router.get('/stats',             authorize(...ALL),   stats)
router.get('/doctors/available', authorize(...ALL),   getAvailableDoctors)

// CRUD
router.get   ('/',                  authorize(...ALL),   list)
router.get   ('/:id',               authorize(...ALL),   getOne)
router.post  ('/',                  authorize(...WRITE), create)
router.put   ('/:id',               authorize(...WRITE), update)
router.post  ('/:id/status',        authorize(...WRITE), updateStatus)
router.post  ('/:id/assign-doctor', authorize(...ADMIN, 'RECEPTIONIST'), assignDoctor)
router.delete('/:id',               authorize(...ADMIN), remove)

export default router
