import api from './client.js'

export const billingApi = {
  getStats:       ()           => api.get('/billing/stats'),
  getHospitals:   ()           => api.get('/billing/hospitals/list'),
  searchOwners:   (q)          => api.get('/billing/owners/search', { params: { q } }),
  getOwnerAnimals:(id)         => api.get(`/billing/owners/${id}/animals`),

  list:           (params)     => api.get('/billing', { params }),
  getOne:         (id)         => api.get(`/billing/${id}`),
  create:         (data)       => api.post('/billing', data),
  pay:            (id, data)   => api.post(`/billing/${id}/pay`, data),
  cancel:         (id, data)   => api.post(`/billing/${id}/cancel`, data),
}
