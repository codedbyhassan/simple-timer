import { useCallback, useEffect, useState } from 'react'
import { ADMIN_ACCESS_USERS } from './accessData.js'

const STORAGE_KEY = 'hms.admin.users.v1'

export default function useAdminUsers() {
  const [users, setUsers] = useState(ADMIN_ACCESS_USERS)
  const [storageError, setStorageError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved !== null) {
        const parsed = JSON.parse(saved)
        if (!Array.isArray(parsed)) throw new Error('Stored user data is not a list.')
        setUsers(parsed)
      }
      setLoaded(true)
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Unable to load saved users.')
      setLoaded(true)
    }
  }, [])

  const commit = useCallback((nextUsers) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUsers))
      setUsers(nextUsers)
      setStorageError('')
      return true
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Unable to save users on this device.')
      return false
    }
  }, [])

  return { users, loaded, storageError, commit }
}
