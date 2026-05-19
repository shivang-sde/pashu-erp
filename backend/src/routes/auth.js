import { Router } from 'express'
import { verifySHA512 } from '../middleware/verifySHA512.js'
import { authenticate } from '../middleware/auth.js'
import {
  login, refresh, logout, me,
  forgotPassword, resetPassword,
} from '../controllers/authController.js'

const router = Router()

// Public routes (SHA-512 verified but no JWT needed)
router.post('/login',           verifySHA512, login)
router.post('/refresh',         verifySHA512, refresh)
router.post('/forgot-password', verifySHA512, forgotPassword)
router.post('/reset-password',  verifySHA512, resetPassword)

// Protected routes
router.post('/logout', verifySHA512, authenticate, logout)
router.get('/me',      verifySHA512, authenticate, me)

export default router
