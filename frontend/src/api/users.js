import api from './client.js'

export const userApi = {
  getStats:      ()           => api.get('/users/stats'),
  getFormData:   ()           => api.get('/users/meta/form-data'),
  list:          (params)     => api.get('/users', { params }),
  getOne:        (id)         => api.get(`/users/${id}`),
  create:        (data)       => api.post('/users', data),
  update:        (id, data)   => api.put(`/users/${id}`, data),
  remove:        (id)         => api.delete(`/users/${id}`),
  resetPassword: (id, data)   => api.post(`/users/${id}/reset-password`, data),
}
