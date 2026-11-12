import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useToast } from '@ui'
import { readDocument, subscribeToDocument, updateDocument } from '@core/storage/localDatabase.js'

const NotificationsContext = createContext(null)
const clock = () => new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })
const STORAGE_KEY = 'local.notifications'
const makeId = () => globalThis.crypto?.randomUUID?.() || `note-${Date.now()}-${Math.random().toString(36).slice(2)}`

export function NotificationsProvider({ children }) {
  const toast = useToast()
  const [items, setItems] = useState([])

  useEffect(() => {
    let alive = true
    const refresh = async () => {
      try {
        const stored = await readDocument(STORAGE_KEY)
        if (alive && Array.isArray(stored)) setItems(stored)
      } catch { /* The current in-memory list remains available. */ }
    }
    refresh()
    const unsubscribe = subscribeToDocument(STORAGE_KEY, refresh)
    return () => { alive = false; unsubscribe() }
  }, [])

  const notify = useCallback(async ({ tier = 'important', title, message, target }) => {
    const item = { id: makeId(), tier, title, message, target, time: clock(), createdAt: new Date().toISOString(), read: false, acknowledged: false }
    try {
      const next = await updateDocument(STORAGE_KEY, (current) => [item, ...(Array.isArray(current) ? current : [])].slice(0, 300), [])
      setItems(next)
    } catch (error) {
      toast.error('Notification could not be saved', error instanceof Error ? error.message : 'Local notification storage is unavailable.')
      return null
    }
    if (tier === 'important') toast.info(title, message)
    return item.id
  }, [toast])

  const markAllRead = useCallback(async () => {
    try {
      const next = await updateDocument(STORAGE_KEY, (current) => (Array.isArray(current) ? current : []).map((item) => ({ ...item, read: true })), [])
      setItems(next)
    } catch (error) {
      toast.error('Notifications could not be updated', error instanceof Error ? error.message : 'Local notification storage is unavailable.')
    }
  }, [toast])

  const acknowledge = useCallback(async (id) => {
    try {
      const next = await updateDocument(STORAGE_KEY, (current) => (Array.isArray(current) ? current : []).map((item) => item.id === id ? { ...item, acknowledged: true, read: true } : item), [])
      setItems(next)
    } catch (error) {
      toast.error('Notification could not be acknowledged', error instanceof Error ? error.message : 'Local notification storage is unavailable.')
    }
  }, [toast])

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
