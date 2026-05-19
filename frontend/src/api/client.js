import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
const API_BASE = BASE_URL.replace(/\/$/, '')
const SECRET   = import.meta.env.VITE_API_SECRET || 'dev-secret'

let URL_PREFIX = ''
try {
  URL_PREFIX = new URL(API_BASE).pathname.replace(/\/$/, '')
} catch {
  URL_PREFIX = ''
}

// ── SHA-512 signer — defined FIRST before any usage ─────────
async function hmacSha512(key, message) {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key),
    { name: 'HMAC', hash: 'SHA-512' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function buildSignature(method, fullPath, bodyStr) {
  const timestamp = Date.now().toString()
  const message   = `${timestamp}|${method.toUpperCase()}|${fullPath}|${bodyStr}`
  const signature = await hmacSha512(SECRET, message)
  return { signature, timestamp }
}

// ── Axios instance ───────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor ──────────────────────────────────────
api.interceptors.request.use(async (config) => {
  try {
    // 1. JWT
    const token = localStorage.getItem('pashu_token')
    if (token) config.headers.Authorization = `Bearer ${token}`

    // 2. Full path without query string
    const relativePath = (config.url || '/').split('?')[0]
    const fullPath = URL_PREFIX + relativePath

    // 3. Raw body string — use exactly what Axios will send
    //    At interceptor time, config.data is already serialized to string by Axios
    const method = config.method?.toUpperCase() || 'GET'
    let bodyStr = ''
    if (config.data !== undefined && config.data !== null && config.data !== '') {
      bodyStr = typeof config.data === 'string'
        ? config.data
        : JSON.stringify(config.data)
    }

    // 4. Sign
    const { signature, timestamp } = await buildSignature(method, fullPath, bodyStr)
    config.headers['X-Signature'] = signature
    config.headers['X-Timestamp'] = timestamp

  } catch (err) {
    console.error('[client.js] Signing error:', err)
  }

  return config
})

// ── Token refresh queue ──────────────────────────────────────
let isRefreshing = false
let failedQueue  = []

function processQueue(error, token = null) {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token))
  failedQueue = []
}

// ── Response interceptor ─────────────────────────────────────
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    const status   = err.response?.status
    const message  = err.response?.data?.message || ''

    const isSignatureError = message.includes('signature') ||
                             message.includes('X-Signature') ||
                             message.includes('X-Timestamp')

    if (status === 401 && !isSignatureError && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        }).catch(e => Promise.reject(e))
      }

      original._retry = true
      isRefreshing    = true

      try {
        const refresh = localStorage.getItem('pashu_refresh')
        if (!refresh) throw new Error('No refresh token')

        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken: refresh })
        const newToken = data.data.accessToken

        localStorage.setItem('pashu_token',   newToken)
        localStorage.setItem('pashu_refresh', data.data.refreshToken)
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`
        original.headers.Authorization            = `Bearer ${newToken}`

        processQueue(null, newToken)
        return api(original)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        localStorage.clear()
        window.location.href = '/auth/login'
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err)
  }
)

export default api
