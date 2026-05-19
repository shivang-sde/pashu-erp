import { Router } from 'express'
import { verifySHA512 }            from '../middleware/verifySHA512.js'
import { authenticate, authorize } from '../middleware/auth.js'
import {
  list, getOne, create, update, remove,
  resetPassword, getFormData, getStats,
} from '../controllers/userController.js'

const router = Router()

router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  verifySHA512(req, res, next)
})
router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  authenticate(req, res, next)
})

const MGRS = ['STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN']

// Static routes first
router.get ('/stats',           authorize(...MGRS), getStats)
router.get ('/meta/form-data',  authorize(...MGRS), getFormData)

router.get ('/',          authorize(...MGRS), list)
router.get ('/:id',       authorize(...MGRS), getOne)
router.post('/',          authorize(...MGRS), create)
router.put ('/:id',       authorize(...MGRS), update)
router.delete('/:id',     authorize(...MGRS), remove)
router.post('/:id/reset-password', authorize(...MGRS), resetPassword)

export default router
