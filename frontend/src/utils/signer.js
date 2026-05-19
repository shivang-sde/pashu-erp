/**
 * HMAC-SHA512 Request Signer
 * Used by client.js — kept for backward compatibility.
 * client.js now uses signRequestRaw internally for accuracy.
 */
const SECRET = import.meta.env.VITE_API_SECRET || 'dev-secret'

async function hmacSha512(key, message) {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key),
    { name: 'HMAC', hash: 'SHA-512' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function signRequest(method, fullPath, body = '') {
  const timestamp = Date.now().toString()
  let bodyStr = ''
  if (body) {
    if (typeof body === 'string') {
      bodyStr = body
    } else if (typeof body === 'object' && Object.keys(body).length > 0) {
      bodyStr = JSON.stringify(body)
    }
  }
  const message   = `${timestamp}|${method.toUpperCase()}|${fullPath}|${bodyStr}`
  const signature = await hmacSha512(SECRET, message)
  return { signature, timestamp }
}
