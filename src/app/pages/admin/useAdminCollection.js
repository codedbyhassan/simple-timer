import { useCallback, useEffect, useState } from 'react'

export default function useAdminCollection(storageKey, defaults) {
  const [records, setRecords] = useState(defaults)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (saved !== null) {
        const parsed = JSON.parse(saved)
        if (!Array.isArray(parsed)) throw new Error('Saved data is not a list.')
        setRecords(parsed)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load saved records.')
    } finally {
      setLoaded(true)
    }
  }, [storageKey])

  const commit = useCallback((next) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next))
      setRecords(next)
      setError('')
      return true
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save changes on this device.')
      return false
    }
  }, [storageKey])

  return { records, loaded, error, commit }
}
