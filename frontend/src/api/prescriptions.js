import api from './client.js'

export const prescriptionApi = {
  list:      (params)      => api.get('/prescriptions', { params }),
  getOne:    (id)          => api.get(`/prescriptions/${id}`),
  create:    (data)        => api.post('/prescriptions', data),
  update:    (id, data)    => api.put(`/prescriptions/${id}`, data),
  sendEmail: (id, data)    => api.post(`/prescriptions/${id}/send-email`, data),
}
