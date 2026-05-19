import api from './client.js'

export const notifApi = {
  list: () => api.get('/notifications'),
}
