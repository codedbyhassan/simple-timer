import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@ui'

const NotificationsContext = createContext(null)
const clock = () => new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })

// Policy (dashboard spec section 5): critical items persist until acknowledged, important items add a badge
// and a quiet toast, routine events never come through here.
export function NotificationsProvider({ children }) {
  const toast = useToast()
  const [items, setItems] = useState([])
  const seq = useRef(0)

  const notify = useCallback(({ tier = 'important', title, message, target }) => {
    const id = ++seq.current
    setItems((list) => [{ id, tier, title, message, target, time: clock(), read: false, acknowledged: false }, ...list])
    if (tier === 'important') toast.info(title, message)
    return id
  }, [toast])

  const markAllRead = useCallback(() => setItems((l) => (l.some((n) => !n.read) ? l.map((n) => ({ ...n, read: true })) : l)), [])
  const acknowledge = useCallback((id) => setItems((l) => l.map((n) => (n.id === id ? { ...n, acknowledged: true, read: true } : n))), [])

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined
    window.__hmsNotify = notify
    return () => { delete window.__hmsNotify }
  }, [notify])

  const value = useMemo(() => {
    const pendingCritical = items.filter((n) => n.tier === 'critical' && !n.acknowledged)
    return { items, unread: items.filter((n) => !n.read).length, pendingCritical, notify, markAllRead, acknowledge }
  }, [items, notify, markAllRead, acknowledge])

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider')
  return ctx
}
