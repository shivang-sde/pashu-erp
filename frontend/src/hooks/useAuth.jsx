import { useState, useCallback, createContext, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth.js'
import { ROLE_DASHBOARD } from '../types/auth.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const navigate             = useNavigate()
  const [isLoading, setLoad] = useState(false)
  const [error, setError]    = useState(null)

  const getUser = useCallback(() => {
    try { return JSON.parse(localStorage.getItem('pashu_user') || 'null') }
    catch { return null }
  }, [])

  const getUserState = useCallback(() => {
    const u = getUser()
    return u?.state || null
  }, [getUser])

  const isAuthenticated = !!localStorage.getItem('pashu_token')

  /* ── LOGIN ── */
  const login = useCallback(async ({ email, password, role }) => {
    setLoad(true); setError(null)
    try {
      const { data } = await authApi.login({ email: email.toLowerCase().trim(), password, role })

      if (!data.success) throw new Error(data.message)

      const { user, accessToken, refreshToken } = data.data
      localStorage.setItem('pashu_token',   accessToken)
      localStorage.setItem('pashu_refresh', refreshToken)
      localStorage.setItem('pashu_user',    JSON.stringify(user))

      navigate(ROLE_DASHBOARD[user.role] || '/dashboard')
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Login failed. Please try again.'
      setError(msg)
    } finally {
      setLoad(false)
    }
  }, [navigate])

  /* ── LOGOUT ── */
  const logout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('pashu_refresh')
      await authApi.logout(refresh)
    } catch { /* ignore API errors on logout */ }
    localStorage.clear()
    navigate('/auth/login')
  }, [navigate])

  return (
    <AuthContext.Provider value={{ login, logout, getUser, getUserState, isLoading, error, setError, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth() must be inside <AuthProvider>')
  return ctx
}
