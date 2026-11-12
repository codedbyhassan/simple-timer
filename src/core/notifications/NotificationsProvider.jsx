import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@ui'
import { readDocument, subscribeToDocument, writeDocument } from '@core/storage/localDatabase.js'

const NotificationsContext = createContext(null)
const clock = () => new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })
const STORAGE_KEY = 'local.notifications'

export function NotificationsProvider({ children }) {
  const toast = useToast()
  const [items, setItems] = useState([])
  const seq = useRef(0)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const stored = await readDocument(STORAGE_KEY)
        if (alive && Array.isArray(stored)) {
          setItems(stored)
          seq.current = stored.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0)
        }
      } catch { /* The notification panel remains usable when local history cannot be read. */ }
    }
    load()
    const refresh = async () => {
      const stored = await readDocument(STORAGE_KEY)
      if (alive && Array.isArray(stored)) setItems(stored)
    }
    const unsubscribe = subscribeToDocument(STORAGE_KEY, refresh)
    return () => { alive = false; unsubscribe() }
  }, [])

  const notify = useCallback(({ tier = 'important', title, message, target }) => {
    const id = ++seq.current
    const next = [{ id, tier, title, message, target, time: clock(), createdAt: new Date().toISOString(), read: false, acknowledged: false }, ...items].slice(0, 300)
    setItems(next)
    writeDocument(STORAGE_KEY, next).catch(() => {})
    if (tier === 'important') toast.info(title, message)
    return id
  }, [items, toast])

  const markAllRead = useCallback(() => {
    const next = items.some((item) => !item.read) ? items.map((item) => ({ ...item, read: true })) : items
    setItems(next)
    writeDocument(STORAGE_KEY, next).catch(() => {})
  }, [items])

  const acknowledge = useCallback((id) => {
    const next = items.map((item) => item.id === id ? { ...item, acknowledged: true, read: true } : item)
    setItems(next)
    writeDocument(STORAGE_KEY, next).catch(() => {})
  }, [items])

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined
    window.__hmsNotify = notify
    return () => { delete window.__hmsNotify }
  }, [notify])

  const value = useMemo(() => {
    const pendingCritical = items.filter((item) => item.tier === 'critical' && !item.acknowledged)
    return { items, unread: items.filter((item) => !item.read).length, pendingCritical, notify, markAllRead, acknowledge }
  }, [items, notify, markAllRead, acknowledge])

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider')
  return ctx
}
