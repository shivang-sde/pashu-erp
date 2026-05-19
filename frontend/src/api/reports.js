import api from './client.js'

export const reportsApi = {
  overview:             (params) => api.get('/reports/overview', { params }),
  appointmentsByMonth:  (params) => api.get('/reports/appointments-by-month', { params }),
  revenueByMonth:       (params) => api.get('/reports/revenue-by-month', { params }),
  animalsByType:        ()       => api.get('/reports/animals-by-type'),
  diseaseAnalysis:      (params) => api.get('/reports/disease-analysis', { params }),
  medicineConsumption:  (params) => api.get('/reports/medicine-consumption', { params }),
  billingByType:        ()       => api.get('/reports/billing-by-type'),
  hospitalPerformance:  ()       => api.get('/reports/hospital-performance'),
  vaccinationSummary:   ()       => api.get('/reports/vaccination-summary'),
  paymentModeBreakdown: ()       => api.get('/reports/payment-mode-breakdown'),
}
