import { Navigate, useLocation } from 'react-router-dom'

export default function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation()
  const token    = localStorage.getItem('pashu_token')

  if (!token) return <Navigate to="/auth/login" state={{ from: location }} replace />

  if (allowedRoles) {
    try {
      const user = JSON.parse(localStorage.getItem('pashu_user') || '{}')
      if (!allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />
    } catch {
      return <Navigate to="/auth/login" replace />
    }
  }

  return children
}
