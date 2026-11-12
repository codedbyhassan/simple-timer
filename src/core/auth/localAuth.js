import { getCurrentProfile, LOCAL_PROFILES_KEY, selectProfile, signOutLocal } from '@core/storage/localProfiles.js'
import { subscribeToDocument } from '@core/storage/localDatabase.js'
import { ROLE_PERMISSIONS } from './rolePermissions.js'

const listeners = new Set()
let current = null
let revision = 0
const emit = (event, profile) => listeners.forEach((listener) => listener(event, profile ? { user: profile } : null))

export const localAuth = {
  async getSession() {
    const requestRevision = revision
    const profile = await getCurrentProfile()
    if (requestRevision === revision) current = profile
    return current ? { user: current } : null
  },
  onAuthChange(listener) {
    listeners.add(listener)
    const unsubscribe = subscribeToDocument(LOCAL_PROFILES_KEY, async () => {
      const requestRevision = revision
      try {
        const profile = await getCurrentProfile()
        if (requestRevision !== revision) return
        current = profile
        emit(current ? 'USER_UPDATED' : 'SIGNED_OUT', current)
      } catch {
        if (requestRevision !== revision) return
        current = null
        emit('SIGNED_OUT', null)
      }
    })
    return () => { listeners.delete(listener); unsubscribe() }
  },
  async signIn(profileId) {
    const requestRevision = ++revision
    const profile = await selectProfile(profileId)
    if (requestRevision !== revision) return current
    current = profile
    emit('SIGNED_IN', current)
    return current
  },
  async signOut() {
    ++revision
    await signOutLocal()
    current = null
    emit('SIGNED_OUT', null)
  },
  async getAccess() {
    const requestRevision = revision
    const profile = await getCurrentProfile()
    if (requestRevision === revision) current = profile
    if (!current) throw new Error('Select a local staff profile to continue.')
    return {
      displayName: current.displayName || current.name,
      roles: [current.role],
      permissions: ROLE_PERMISSIONS[current.role] || [],
      department: current.department || '',
    }
  },
}
