import api from './client.js'

export const pharmacyApi = {
  // Stats & alerts
  getStats:       ()       => api.get('/pharmacy/stats'),
  getAlerts:      ()       => api.get('/pharmacy/alerts'),
  getHospitals:   ()       => api.get('/pharmacy/hospitals/list'),

  // Medicine master
  listMedicines:  (params) => api.get('/pharmacy/medicines', { params }),
  createMedicine: (data)   => api.post('/pharmacy/medicines', data),
  updateMedicine: (id, d)  => api.put(`/pharmacy/medicines/${id}`, d),

  // Stock
  getStock:       (params) => api.get('/pharmacy/stock', { params }),
  getBatches:     (params) => api.get('/pharmacy/batches', { params }),
  getMovements:   (params) => api.get('/pharmacy/movements', { params }),
  stockIn:        (data)   => api.post('/pharmacy/stock-in', data),
  stockOut:       (data)   => api.post('/pharmacy/stock-out', data),
  transfer:       (data)   => api.post('/pharmacy/transfer', data),
}
