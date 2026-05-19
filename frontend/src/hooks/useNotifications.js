import { useState, useEffect, useRef, useCallback } from 'react'

const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
// SSE base (no /api/v1 suffix needed — we build the full URL)
const SSE_BASE = VITE_API_URL

export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [count,         setCount]         = useState(0)
  const [connected,     setConnected]     = useState(false)
  const esRef   = useRef(null)
  const retryRef = useRef(null)
  const retries  = useRef(0)

  const connect = useCallback(() => {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
    if (!token) return

    // Close existing
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    // SSE — pass token as query param since EventSource can't set headers
    const url = `${SSE_BASE}/notifications/stream?token=${encodeURIComponent(token)}`
    const es  = new EventSource(url)
    esRef.current = es

    es.onopen = () => {
      setConnected(true)
      retries.current = 0
    }

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'INIT' || msg.type === 'REFRESH') {
          setNotifications(msg.notifications || [])
          setCount(msg.count || 0)
        }
      } catch {}
    }

    es.onerror = () => {
      setConnected(false)
      es.close()
      esRef.current = null
      // Exponential backoff: 5s, 10s, 20s, max 60s
      const delay = Math.min(5000 * Math.pow(2, retries.current), 60000)
      retries.current++
      retryRef.current = setTimeout(connect, delay)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (esRef.current)  { esRef.current.close(); esRef.current = null }
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [connect])

  // Also fetch via normal API immediately (in case SSE is slow)
  useEffect(() => {
    import('../api/notifications.js').then(({ notifApi }) => {
      notifApi.list()
        .then(r => {
          setNotifications(r.data.data || [])
          setCount(r.data.count || 0)
        })
        .catch(() => {})
    })
  }, [])

  function dismiss(id) {
    setNotifications(p => p.filter(n => n.id !== id))
    setCount(p => Math.max(0, p - 1))
  }

  function dismissAll() {
    setNotifications([])
    setCount(0)
  }

  return { notifications, count, connected, dismiss, dismissAll }
}
