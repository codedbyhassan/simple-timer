import { getCurrentProfile, LOCAL_PROFILES_KEY, selectProfile, signOutLocal } from '@core/storage/localProfiles.js'
import { subscribeToDocument } from '@core/storage/localDatabase.js'
import { ROLE_PERMISSIONS } from './rolePermissions.js'

const listeners = new Set()
let current = null
const emit = (event, profile) => listeners.forEach((listener) => listener(event, profile ? { user: profile } : null))

export const localAuth = {
  async getSession() {
    current = await getCurrentProfile()
    return current ? { user: current } : null
  },
  onAuthChange(listener) {
    listeners.add(listener)
    const unsubscribe = subscribeToDocument(LOCAL_PROFILES_KEY, async () => {
      current = await getCurrentProfile()
      emit(current ? 'USER_UPDATED' : 'SIGNED_OUT', current)
    })
    return () => { listeners.delete(listener); unsubscribe() }
  },
  async signIn(profileId) {
    current = await selectProfile(profileId)
    emit('SIGNED_IN', current)
    return current
  },
  async signOut() {
    await signOutLocal()
    current = null
    emit('SIGNED_OUT', null)
  },
  async getAccess() {
    current = await getCurrentProfile()
    if (!current) throw new Error('Select a local staff profile to continue.')
    return {
      displayName: current.displayName || current.name,
      roles: [current.role],
      permissions: ROLE_PERMISSIONS[current.role] || [],
      department: current.department || '',
    }
  },
  isRecovery: () => false,
  initialLinkError: () => null,
  waitForRecovery: async () => false,
  async requestPasswordReset() {
    throw new Error('Password reset is not available in local-profile mode. Profiles do not use passwords.')
  },
  async updatePassword() {
    throw new Error('Local profiles do not use passwords.')
  },
}
