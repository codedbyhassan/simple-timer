import { useEffect, useState } from 'react'
import { getProfiles, saveProfiles } from '@core/storage/localProfiles.js'
import { subscribeToDocument } from '@core/storage/localDatabase.js'

const toUser = (profile) => ({
  ...profile,
  name: profile.displayName || profile.name,
  email: profile.email || '',
  status: profile.active === false ? 'Suspended' : 'Active',
  lastSeen: profile.lastSeen || 'Not signed in',
})

export default function useAdminUsers() {
  const [users, setUsers] = useState([])
  const [storageError, setStorageError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    const refresh = async () => {
      try {
        const profiles = await getProfiles()
        if (alive) { setUsers(profiles.map(toUser)); setStorageError('') }
      } catch (error) {
        if (alive) setStorageError(error instanceof Error ? error.message : 'Unable to load local profiles.')
      } finally { if (alive) setLoaded(true) }
    }
    refresh()
    const unsubscribe = subscribeToDocument('local.profiles', refresh)
    return () => { alive = false; unsubscribe() }
  }, [])

  const commit = async (nextUsers) => {
    try {
      const profiles = nextUsers.map((user) => ({
        ...user,
        displayName: user.name,
        name: user.name,
        active: user.status !== 'Suspended',
      }))
      await saveProfiles(profiles)
      setUsers(nextUsers)
      setStorageError('')
      return true
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Unable to save local profiles.')
      return false
    }
  }

  return { users, loaded, storageError, commit }
}
