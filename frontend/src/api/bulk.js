import api from './client.js'

export const bulkApi = {
  getTemplate: (type)        => api.get(`/bulk/template/${type}`),
  validate:    (type, rows)  => api.post('/bulk/validate',  { type, rows }),
  import:      (type, rows)  => api.post('/bulk/import',    { type, rows }),
}
