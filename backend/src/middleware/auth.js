import jwt from 'jsonwebtoken'
import { User } from '../models/index.js'

/**
 * authenticate
 * Verifies JWT Bearer token (or ?token= query param for SSE)
 */
export async function authenticate(req, res, next) {
  // Support token from query param for SSE (EventSource can't set headers)
  const header = req.headers.authorization
  let token = null

  if (header?.startsWith('Bearer ')) {
    token = header.split(' ')[1]
  } else if (req.query.token) {
    token = req.query.token
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user    = await User.findByPk(payload.userId, {
      attributes: { exclude: ['password'] },
    })
    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: 'User not found or inactive' })
    }
    req.user = user
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
}

/**
 * authorize(...roles)
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}`,
      })
    }
    next()
  }
}
