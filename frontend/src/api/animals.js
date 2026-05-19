import api from './client.js'

export const animalApi = {
  list:           (params) => api.get('/animals', { params }),
  getOne:         (id)     => api.get(`/animals/${id}`),
  create:         (data)   => api.post('/animals', data),
  update:         (id, d)  => api.put(`/animals/${id}`, d),
  remove:         (id)     => api.delete(`/animals/${id}`),
  addDisease:     (id, d)  => api.post(`/animals/${id}/diseases`, d),
  addVaccination: (id, d)  => api.post(`/animals/${id}/vaccinations`, d),
  getStats:       ()       => api.get('/animals/stats'),
  getHistory:     (id)     => api.get(`/animals/${id}/history`),
}
