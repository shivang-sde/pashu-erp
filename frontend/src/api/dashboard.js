import api from './client.js'

export const dashboardApi = {
  getStats:           () => api.get('/dashboard/stats'),
  getHospitals:       (params) => api.get('/dashboard/hospitals', { params }),
  getUserRoles:       () => api.get('/dashboard/user-roles'),
  getDistrictSummary: (state='') => api.get('/dashboard/district-summary' + (state ? '?state='+encodeURIComponent(state) : '')),
  getRecentActivity:  () => api.get('/dashboard/recent-activity'),
}
