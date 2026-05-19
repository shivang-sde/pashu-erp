import api from './client.js'

export const appointmentApi = {
  list:            (params)    => api.get('/appointments', { params }),
  today:           ()          => api.get('/appointments/today'),
  stats:           ()          => api.get('/appointments/stats'),
  getOne:          (id)        => api.get(`/appointments/${id}`),
  create:          (data)      => api.post('/appointments', data),
  update:          (id, data)  => api.put(`/appointments/${id}`, data),
  updateStatus:    (id, data)  => api.post(`/appointments/${id}/status`, data),
  assignDoctor:    (id, data)  => api.post(`/appointments/${id}/assign-doctor`, data),
  remove:          (id)        => api.delete(`/appointments/${id}`),
  getAvailableDoctors: (hospital_id) => api.get('/appointments/doctors/available', { params: { hospital_id } }),
}
