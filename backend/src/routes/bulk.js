import { Router } from 'express'
import { verifySHA512 }            from '../middleware/verifySHA512.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { getTemplate, validate, importRows } from '../controllers/bulkImportController.js'

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

router.get ('/template/:type', authorize(...ADMINS),                        getTemplate)
router.post('/validate',       authorize(...ADMINS),                        validate)
router.post('/import',         authorize('STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN'), importRows)

export default router
