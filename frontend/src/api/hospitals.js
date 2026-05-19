import api from './client.js'

export const hospitalApi = {
  list:           (params)   => api.get('/hospitals', { params }),
  getOne:         (id)       => api.get(`/hospitals/${id}`),
  getDetail:      (id)       => api.get(`/hospitals/${id}/detail`),
  create:         (data)     => api.post('/hospitals', data),
  update:         (id, data) => api.put(`/hospitals/${id}`, data),
  remove:         (id)       => api.delete(`/hospitals/${id}`),
  getAllDistricts: ()         => api.get('/hospitals/districts/all'),
}
