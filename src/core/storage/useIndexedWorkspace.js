import { useCallback, useEffect, useState } from 'react'
import { initialiseWorkspace, readDocument, subscribeToDocument, writeDocument } from './localDatabase.js'

export const HOSPITAL_WORKSPACE_KEY = 'hospital.workspace.v2'

export default function useIndexedWorkspace(defaults, errorLabel = 'workspace') {
  const [data, setData] = useState(defaults)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const value = await initialiseWorkspace(HOSPITAL_WORKSPACE_KEY, defaults)
        if (alive) {
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
        if (alive && value) setData(value)
      } catch (refreshError) {
        if (alive) setError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh local data.')
      }
    }
    const unsubscribe = subscribeToDocument(HOSPITAL_WORKSPACE_KEY, refresh)
    return () => { alive = false; unsubscribe() }
  }, [defaults, errorLabel])

  const commit = useCallback(async (next) => {
    try {
      await writeDocument(HOSPITAL_WORKSPACE_KEY, next)
      setData(next)
      setError('')
      return true
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : `Unable to save ${errorLabel} changes on this device.`)
      return false
    }
  }, [errorLabel])

  return { data, error, loaded, commit }
}
