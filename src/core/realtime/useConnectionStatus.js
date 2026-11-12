import { useEffect, useRef } from 'react'

// There is no always-on indicator. People are told only when something changes: the connection drops or returns.
// When the realtime layer arrives (milestone M6) it reports channel loss and recovery through the same notices.
export function useConnectionNotices(toast) {
  const lost = useRef(false)
  useEffect(() => {
    const off = () => {
      lost.current = true
      toast.warning({
        title: 'You are offline',
        message: 'Anything that needs the server will not complete until the connection returns. Nothing you see as confirmed is lost.',
        duration: 12000,
      })
    }
    const on = () => {
      if (!lost.current) return
      lost.current = false
      toast.success('Back online', 'Screens are refreshing.')
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) off()
    window.addEventListener('offline', off)
    window.addEventListener('online', on)
    return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on) }
  }, [toast])
}
