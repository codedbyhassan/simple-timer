import { useCallback, useEffect, useState } from 'react'
import { readDocument, subscribeToDocument, updateDocument } from './localDatabase.js'

const KEY = 'local.ui-preferences'
const DEFAULTS = { theme: 'system', rail: 'expanded' }

function readCache() {
  try {
    return {
      theme: localStorage.getItem('hms.theme') || DEFAULTS.theme,
      rail: localStorage.getItem('hms.rail') || DEFAULTS.rail,
    }
  } catch {
    return DEFAULTS
  }
}

function writeCache(preferences) {
  try {
    localStorage.setItem('hms.theme', preferences.theme || DEFAULTS.theme)
    localStorage.setItem('hms.rail', preferences.rail || DEFAULTS.rail)
  } catch { /* The cache is optional; IndexedDB remains authoritative. */ }
}

export default function useLocalPreferences() {
  const [preferences, setPreferences] = useState(readCache)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    const refresh = async () => {
      try {
        let saved = await readDocument(KEY)
        if (!saved) {
          saved = await updateDocument(KEY, (current) => current || readCache(), DEFAULTS)
        }
        if (alive) {
          const next = { ...DEFAULTS, ...saved }
          setPreferences(next)
          writeCache(next)
        }
      } catch {
        // Keep the last cached preference if IndexedDB is temporarily unavailable.
      } finally {
        if (alive) setLoaded(true)
      }
    }
    refresh()
    const unsubscribe = subscribeToDocument(KEY, refresh)
    return () => { alive = false; unsubscribe() }
  }, [])

  const updatePreference = useCallback(async (key, value) => {
    if (!Object.hasOwn(DEFAULTS, key)) throw new Error('Unknown local preference.')
    const saved = await updateDocument(KEY, (current) => ({ ...DEFAULTS, ...(current || {}), [key]: value }), DEFAULTS)
    const next = { ...DEFAULTS, ...saved }
    setPreferences(next)
    writeCache(next)
    return next
  }, [])

  return { preferences, updatePreference, loaded }
}
