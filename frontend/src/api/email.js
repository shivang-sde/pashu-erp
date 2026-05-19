import api from './client.js'

export const emailApi = {
  status:          ()              => api.get('/email/status'),
  test:            (data)          => api.post('/email/test', data),
  sendBill:        (billId, data)  => api.post(`/email/send-bill/${billId}`, data),
  sendAppointment: (apptId, data)  => api.post(`/email/send-appointment/${apptId}`, data),
}
