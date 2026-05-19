import api from './client.js'

export const printApi = {
  billingSummary:   (params) => api.get('/print/billing-summary',   { params }),
  stockReport:      (params) => api.get('/print/stock-report',      { params }),
  appointmentQueue: (params) => api.get('/print/appointment-queue', { params }),
}
