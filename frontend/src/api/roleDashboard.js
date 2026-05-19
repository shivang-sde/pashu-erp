import api from './client.js'

export const roleDashApi = {
  doctor:        () => api.get('/role-dashboard/doctor'),
  hospitalAdmin: () => api.get('/role-dashboard/hospital-admin'),
  receptionist:  () => api.get('/role-dashboard/receptionist'),
  pharmacist:    () => api.get('/role-dashboard/pharmacist'),
}
