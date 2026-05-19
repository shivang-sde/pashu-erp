import { Router } from 'express'
import { verifySHA512 }            from '../middleware/verifySHA512.js'
import { authenticate }            from '../middleware/auth.js'
import { getNotifications, streamNotifications } from '../controllers/notificationController.js'

const router = Router()

// SSE stream — skip SHA512 (EventSource doesn't support custom headers)
router.get('/stream', (req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  authenticate(req, res, next)
}, streamNotifications)

// Regular JSON fetch — with SHA512
router.get('/', (req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  verifySHA512(req, res, next)
}, (req, res, next) => {
  authenticate(req, res, next)
}, getNotifications)

export default router
