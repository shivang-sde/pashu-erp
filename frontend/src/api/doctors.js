import api from './client.js'

export const doctorApi = {
  list:               (params)   => api.get('/doctors', { params }),
  getOne:             (id)       => api.get(`/doctors/${id}`),
  getProfile:         (id)       => api.get(`/doctors/${id}/profile`),
  create:             (data)     => api.post('/doctors', data),
  update:             (id, data) => api.put(`/doctors/${id}`, data),
  remove:             (id)       => api.delete(`/doctors/${id}`),
  getHospitals:       ()         => api.get('/doctors/hospitals/all'),
  getSpecializations: ()         => api.get('/doctors/specializations/all'),
}
