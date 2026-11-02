import { roleDefinitions } from '../access/roleAccess.js'

const SESSION_KEY = 'ascend-hms-preview-session-v1'
const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(`${SESSION_KEY}:updates`)
const listeners = new Set()

function isValidSession(value) {
  return value
    && typeof value === 'object'
    && typeof value.id === 'string'
    && typeof value.displayName === 'string'
    && Array.isArray(value.roleIds)
    && value.roleIds.length === 1
    && roleDefinitions.some((role) => role.id === value.roleIds[0])
}

function readSession() {
  try {
    const saved = localStorage.getItem(SESSION_KEY)
    if (!saved) return null
    const session = JSON.parse(saved)
    if (!isValidSession(session)) throw new Error('Stored preview session is invalid.')
    return session
  } catch (error) {
    console.error('Could not read the preview sign-in session.', error)
    return null
  }
}

let snapshot = readSession()

function notify(next) {
  snapshot = next
  listeners.forEach((listener) => listener())
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== SESSION_KEY) return
    try {
      const session = event.newValue ? JSON.parse(event.newValue) : null
      if (session !== null && !isValidSession(session)) {
        console.error('Ignored an invalid cross-tab preview session.')
        return
      }
      notify(session)
    } catch (error) {
      console.error('Could not apply a cross-tab preview session update.', error)
    }
  })
  channel?.addEventListener('message', (event) => {
    if (event.data !== null && !isValidSession(event.data)) {
      console.error('Ignored an invalid broadcast preview session.')
      return
    }
    notify(event.data)
  })
}

export function getPreviewSession() {
  return snapshot
}

export function subscribeToPreviewSession(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function signInToPreview(roleIds) {
  const selectedRoles = roleDefinitions.filter((role) => roleIds.includes(role.id))
  if (roleIds.length !== 1 || selectedRoles.length !== 1) {
    throw new Error('Choose exactly one valid preview role.')
  }
  const session = {
    id: `preview-${Date.now().toString(36)}`,
    displayName: `${selectedRoles[0].name} Demo`,
    roleIds: selectedRoles.map((role) => role.id),
    signedInAt: new Date().toISOString(),
  }
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch (error) {
    throw new Error(`Could not save the preview sign-in session: ${error instanceof Error ? error.message : String(error)}`)
  }
  notify(session)
  channel?.postMessage(session)
  return session
}

export function signOutOfPreview() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch (error) {
    throw new Error(`Could not clear the preview sign-in session: ${error instanceof Error ? error.message : String(error)}`)
  }
  notify(null)
  channel?.postMessage(null)
}
