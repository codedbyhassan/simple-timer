import { useCallback, useEffect, useState } from 'react'
import { RECEPTION_SEED } from './receptionData.js'

const STORAGE_KEY = 'hms.reception.workspace.v1'
const isWorkspace = (value) => value && typeof value === 'object'
  && ['patients', 'appointments', 'queue', 'payments', 'documents'].every((key) => Array.isArray(value[key]))

function readWorkspace() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === null) return { data: RECEPTION_SEED, error: '' }
    const parsed = JSON.parse(saved)
    if (!isWorkspace(parsed)) throw new Error('Saved reception workspace data is not in the expected format.')
    return { data: parsed, error: '' }
  } catch (error) {
    return { data: RECEPTION_SEED, error: error instanceof Error ? error.message : 'Unable to load reception workspace data.' }
  }
}

export default function useReceptionWorkspace() {
  const [initial] = useState(readWorkspace)
  const [data, setData] = useState(initial.data)
  const [error, setError] = useState(initial.error)

  useEffect(() => {
    const refresh = () => {
      const current = readWorkspace()
      setData(current.data)
      setError(current.error)
    }
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) refresh()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('hms:workspace-updated', refresh)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('hms:workspace-updated', refresh)
    }
  }, [])

  const commit = useCallback((next) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setData(next)
      setError('')
      window.dispatchEvent(new Event('hms:workspace-updated'))
      return true
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save reception changes on this device.')
      return false
    }
  }, [])

  return { data, error, commit }
}
