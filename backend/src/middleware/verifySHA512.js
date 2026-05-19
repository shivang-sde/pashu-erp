import { createHmac } from 'crypto'

const SECRET       = process.env.API_SIGNING_SECRET || 'dev-secret'
const MAX_DRIFT_MS = 30_000

export function verifySHA512(req, res, next) {
  if (process.env.SKIP_SIGNATURE === 'true') return next()

  const signature = req.headers['x-signature']
  const timestamp = req.headers['x-timestamp']

  if (!signature || !timestamp) {
    return res.status(401).json({ success: false, message: 'Missing X-Signature or X-Timestamp headers' })
  }

  const ts  = parseInt(timestamp, 10)
  const now = Date.now()
  if (isNaN(ts) || Math.abs(now - ts) > MAX_DRIFT_MS) {
    return res.status(401).json({ success: false, message: 'Request timestamp expired (>30s).' })
  }

  const method   = req.method.toUpperCase()
  const fullPath = req.originalUrl.split('?')[0]

  // Try both raw body and re-serialised body — log both so we can see which matches
  const rawBody     = req._rawBody || ''
  const parsedBody  = (req.body && Object.keys(req.body).length > 0) ? JSON.stringify(req.body) : ''

  // Build both candidate messages
  const msgWithRaw    = `${timestamp}|${method}|${fullPath}|${rawBody}`
  const msgWithParsed = `${timestamp}|${method}|${fullPath}|${parsedBody}`

  const sigWithRaw    = createHmac('sha512', SECRET).update(msgWithRaw).digest('hex')
  const sigWithParsed = createHmac('sha512', SECRET).update(msgWithParsed).digest('hex')

  const matchesRaw    = timingSafeEqual(sigWithRaw,    signature)
  const matchesParsed = timingSafeEqual(sigWithParsed, signature)

  // Always log in dev so we can see what's happening
  if (process.env.NODE_ENV === 'development') {
    console.log('\n[SHA512] Request:', method, fullPath)
    console.log('  rawBody    :', JSON.stringify(rawBody))
    console.log('  parsedBody :', JSON.stringify(parsedBody))
    console.log('  matchRaw   :', matchesRaw)
    console.log('  matchParsed:', matchesParsed)
    console.log('  received   :', signature.slice(0, 20) + '...')
    console.log('  sigRaw     :', sigWithRaw.slice(0, 20) + '...')
    console.log('  sigParsed  :', sigWithParsed.slice(0, 20) + '...')
  }

  if (matchesRaw || matchesParsed) {
    return next()
  }

  return res.status(401).json({ success: false, message: 'Invalid request signature' })
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
