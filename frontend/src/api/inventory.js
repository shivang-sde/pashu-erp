import api from './client.js'

export const inventoryApi = {
  getStats:       ()       => api.get('/inventory/stats'),
  getAlerts:      ()       => api.get('/inventory/alerts'),
  getHospitals:   ()       => api.get('/inventory/hospitals/list'),

  listItems:      (params) => api.get('/inventory/items', { params }),
  createItem:     (data)   => api.post('/inventory/items', data),
  updateItem:     (id, d)  => api.put(`/inventory/items/${id}`, d),

  getStock:       (params) => api.get('/inventory/stock', { params }),
  getMovements:   (params) => api.get('/inventory/movements', { params }),
  stockIn:        (data)   => api.post('/inventory/stock-in', data),
  stockOut:       (data)   => api.post('/inventory/stock-out', data),
  transfer:       (data)   => api.post('/inventory/transfer', data),
}
