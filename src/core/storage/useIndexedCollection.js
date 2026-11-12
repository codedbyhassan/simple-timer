import { useCallback, useEffect, useState } from 'react'
import { appendAuditEvent, readDocument, subscribeToDocument, writeDocument } from './localDatabase.js'

export default function useIndexedCollection(key, defaults = []) {
  const [records, setRecords] = useState(defaults)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const saved = await readDocument(key)
        if (alive) setRecords(Array.isArray(saved) ? saved : defaults)
      } catch (loadError) {
        if (alive) setError(loadError instanceof Error ? loadError.message : 'Unable to load local records.')
      } finally {
        if (alive) setLoaded(true)
      }
    }
    load()
    const refresh = async () => {
      try {
        const saved = await readDocument(key)
        if (alive && Array.isArray(saved)) setRecords(saved)
      } catch (loadError) {
        if (alive) setError(loadError instanceof Error ? loadError.message : 'Unable to refresh local records.')
      }
    }
    const unsubscribe = subscribeToDocument(key, refresh)
    return () => { alive = false; unsubscribe() }
  }, [key, defaults])

  const commit = useCallback(async (next) => {
    try {
      await writeDocument(key, next)
      try { await appendAuditEvent({ action: 'Updated local configuration', resource: key, category: 'Administration' }) } catch { /* Keep the primary save successful if the audit write fails. */ }
      setRecords(next)
      setError('')
      return true
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save local records.')
      return false
    }
  }, [key])

  return { records, loaded, error, commit }
}
