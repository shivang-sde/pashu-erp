import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
// uuid not needed here — Sequelize handles UUIDs via DataTypes.UUIDV4
import { User, RefreshToken } from '../models/index.js'
import { createAuditLog } from '../middleware/auditLog.js'

const ACCESS_SECRET  = process.env.JWT_SECRET
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
const ACCESS_EXPIRY  = process.env.JWT_EXPIRES_IN         || '15m'
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

function generateTokens(user) {
  const payload = { userId: user.id, role: user.role, email: user.email }

  const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY })

  const refreshToken = jwt.sign(
    { userId: user.id },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  )

  return { accessToken, refreshToken }
}

// ── POST /api/v1/auth/login ─────────────────────────────────
export async function login(req, res) {
  try {
    const { email, password, role } = req.body

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Email, password and role are required' })
    }

    // Find user with password included
    const user = await User.scope('withPassword').findOne({ where: { email: email.toLowerCase().trim() } })

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    if (user.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: 'Your account is inactive. Contact administrator.' })
    }

    if (user.role !== role) {
      return res.status(401).json({ success: false, message: `This account is not registered as ${role}` })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const { accessToken, refreshToken } = generateTokens(user)

    // Store refresh token in DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await RefreshToken.create({
      user_id:    user.id,
      token:      refreshToken,
      expires_at: expiresAt,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    })

    // Update last login
    await user.update({ last_login: new Date() })

    // Audit log
    await createAuditLog({
      userId: user.id, action: 'LOGIN',
      tableName: 'users', recordId: user.id,
      newValues: { email: user.email, role: user.role },
      req,
    })

    // Return user without password
    const safeUser = {
      id:             user.id,
      name:           user.name,
      email:          user.email,
      role:           user.role,
      specialization: user.specialization,
      hospitalId:     user.hospital_id,
      districtId:     user.district_id,
      state:          user.district?.state || null,
      districtName:   user.district?.name  || null,
      hospitalName:   user.hospital?.name  || null,
      avatar:         user.avatar,
      status:         user.status,
    }

    res.json({ success: true, data: { user: safeUser, accessToken, refreshToken } })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// ── POST /api/v1/auth/refresh ───────────────────────────────
export async function refresh(req, res) {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' })
    }

    // Verify JWT
    let payload
    try {
      payload = jwt.verify(refreshToken, REFRESH_SECRET)
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' })
    }

    // Check DB record exists and not revoked
    const storedToken = await RefreshToken.findOne({
      where: { user_id: payload.userId, token: refreshToken, revoked: false },
    })
    if (!storedToken || new Date() > storedToken.expires_at) {
      return res.status(401).json({ success: false, message: 'Refresh token expired or revoked' })
    }

    const user = await User.findByPk(payload.userId)
    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: 'User not found or inactive' })
    }

    // Rotate: revoke old, issue new
    await storedToken.update({ revoked: true })
    const tokens = generateTokens(user)

    await RefreshToken.create({
      user_id:    user.id,
      token:      tokens.refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    })

    res.json({ success: true, data: tokens })
  } catch (err) {
    console.error('Refresh error:', err)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// ── POST /api/v1/auth/logout ────────────────────────────────
export async function logout(req, res) {
  try {
    const { refreshToken } = req.body

    if (refreshToken) {
      await RefreshToken.update(
        { revoked: true },
        { where: { user_id: req.user.id, token: refreshToken } }
      )
    }

    await createAuditLog({
      userId: req.user.id, action: 'LOGOUT',
      tableName: 'users', recordId: req.user.id, req,
    })

    res.json({ success: true, message: 'Logged out successfully' })
  } catch (err) {
    console.error('Logout error:', err)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// ── GET /api/v1/auth/me ─────────────────────────────────────
export async function me(req, res) {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { association: 'hospital', attributes: ['id', 'name', 'code'] },
        { association: 'district', attributes: ['id', 'name', 'code'] },
      ],
    })
    res.json({ success: true, data: { user } })
  } catch (err) {
    console.error('Me error:', err)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// ── POST /api/v1/auth/forgot-password ──────────────────────
export async function forgotPassword(req, res) {
  // Always return success to prevent user enumeration
  res.json({ success: true, message: 'If this email is registered, a reset link has been sent.' })
}

// ── POST /api/v1/auth/reset-password ───────────────────────
export async function resetPassword(req, res) {
  res.status(501).json({ success: false, message: 'Reset password via email not configured yet.' })
}
