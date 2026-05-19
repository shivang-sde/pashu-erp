import api from './client.js'

export const authApi = {
  login:          (data)                  => api.post('/auth/login', data),
  logout:         (refreshToken)          => api.post('/auth/logout', { refreshToken }),
  refresh:        (refreshToken)          => api.post('/auth/refresh', { refreshToken }),
  me:             ()                      => api.get('/auth/me'),
  forgotPassword: (email)                 => api.post('/auth/forgot-password', { email }),
  resetPassword:  (token, newPassword)    => api.post('/auth/reset-password', { token, newPassword }),
}
