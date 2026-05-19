import { Router } from 'express'
import { verifySHA512 } from '../middleware/verifySHA512.js'
import { authenticate, authorize } from '../middleware/auth.js'
import {
  list, getOne, create, update, remove,
  getHospitalsForDropdown, getSpecializations,
} from '../controllers/doctorController.js'
import { getDoctorProfile } from '../controllers/doctorProfileController.js'

const router = Router()

router.use(verifySHA512)
router.use(authenticate)

const ADMINS = ['STATE_ADMIN', 'DISTRICT_ADMIN', 'HOSPITAL_ADMIN']

// Static routes FIRST (before /:id)
router.get('/hospitals/all',        authorize(...ADMINS),                        getHospitalsForDropdown)
router.get('/specializations/all',  authorize(...ADMINS),                        getSpecializations)

router.get ('/',    authorize(...ADMINS),                               list)
router.get ('/:id/profile', authorize(...ADMINS, 'DOCTOR'),            getDoctorProfile)
router.get ('/:id',         authorize(...ADMINS, 'DOCTOR'),            getOne)
router.post('/',    authorize('STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN'), create)
router.put ('/:id', authorize('STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN'), update)
router.delete('/:id', authorize('STATE_ADMIN','DISTRICT_ADMIN'),                remove)

export default router
