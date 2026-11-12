import { useCallback, useEffect, useRef, useState } from 'react'
import { appendAuditEvent, initialiseWorkspace, mergeChanged, readDocument, subscribeToDocument, updateDocument } from './localDatabase.js'

export const HOSPITAL_WORKSPACE_KEY = 'hospital.workspace.v2'

export default function useIndexedWorkspace(defaults, errorLabel = 'workspace') {
  const [data, setData] = useState(defaults)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const baseRef = useRef(defaults)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const value = await initialiseWorkspace(HOSPITAL_WORKSPACE_KEY, defaults)
        if (alive) {
          baseRef.current = value
          setData(value)
          setError('')
          setLoaded(true)
        }
      } catch (loadError) {
        if (alive) {
          setError(loadError instanceof Error ? loadError.message : `Unable to load ${errorLabel} data.`)
          setLoaded(true)
        }
      }
    }
    load()
    const refresh = async () => {
      try {
        const value = await readDocument(HOSPITAL_WORKSPACE_KEY)
        if (alive && value) { baseRef.current = value; setData(value) }
      } catch (refreshError) {
        if (alive) setError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh local data.')
      }
    }
    const unsubscribe = subscribeToDocument(HOSPITAL_WORKSPACE_KEY, refresh)
    return () => { alive = false; unsubscribe() }
  }, [defaults, errorLabel])

  const commit = useCallback(async (next) => {
    try {
      const saved = await updateDocument(HOSPITAL_WORKSPACE_KEY, (current) => mergeChanged(baseRef.current, next, current || defaults), defaults)
      baseRef.current = saved
      try { await appendAuditEvent({ action: 'Updated operational records', resource: 'Hospital workspace', category: 'Operations' }) } catch { /* The clinical write remains saved; audit failures are surfaced separately. */ }
      setData(saved)
      setError('')
      return true
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : `Unable to save ${errorLabel} changes on this device.`)
      return false
    }
  }, [errorLabel])

  return { data, error, loaded, commit }
}
