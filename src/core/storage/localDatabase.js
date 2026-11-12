const DB_NAME = 'ascend-hms-local'
const DB_VERSION = 1
const STORE = 'documents'
const CHANNEL = 'ascend-hms-local-changes'
let dbPromise
let channel

function openDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable in this browser. Use a supported browser or the desktop application.'))
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' })
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error || new Error('Unable to open local database.'))
      request.onblocked = () => reject(new Error('The local database is being upgraded in another tab. Close other Ascend HMS tabs and retry.'))
    })
  }
  return dbPromise
}

function notify(key) {
  window.dispatchEvent(new CustomEvent('ascend:local-data-changed', { detail: { key } }))
  try {
    channel ||= typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null
    channel?.postMessage({ key })
  } catch { /* BroadcastChannel is optional. */ }
}

export async function readDocument(key) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
    request.onsuccess = () => resolve(request.result?.value ?? null)
    request.onerror = () => reject(request.error || new Error('Unable to read local data.'))
  })
}

export async function writeDocument(key, value) {
  const db = await openDatabase()
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite')
    transaction.objectStore(STORE).put({ key, value, updatedAt: new Date().toISOString() })
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error || new Error('Unable to save local data.'))
    transaction.onabort = () => reject(transaction.error || new Error('Local data save was cancelled.'))
  })
  notify(key)
  return value
}

export async function updateDocument(key, updater, fallback = null) {
  const db = await openDatabase()
  const next = await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite')
    const store = transaction.objectStore(STORE)
    const request = store.get(key)
    let value
    request.onsuccess = () => {
      try {
        value = updater(request.result?.value ?? fallback)
        store.put({ key, value, updatedAt: new Date().toISOString() })
      } catch (error) {
        transaction.abort()
        reject(error)
      }
    }
    request.onerror = () => reject(request.error || new Error('Unable to read local data for update.'))
    transaction.oncomplete = () => resolve(value)
    transaction.onerror = () => reject(transaction.error || new Error('Unable to update local data.'))
    transaction.onabort = () => reject(transaction.error || new Error('Local data update was cancelled.'))
  })
  notify(key)
  return next
}

export function subscribeToDocument(key, callback) {
  const onChange = (event) => {
    if (!event.detail?.key || event.detail.key === '*' || event.detail.key === key) callback()
  }
  const onMessage = (event) => {
    if (!event.data?.key || event.data.key === '*' || event.data.key === key) callback()
  }
  window.addEventListener('ascend:local-data-changed', onChange)
  try {
    channel ||= typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null
    channel?.addEventListener('message', onMessage)
  } catch { /* BroadcastChannel is optional. */ }
  return () => {
    window.removeEventListener('ascend:local-data-changed', onChange)
    channel?.removeEventListener('message', onMessage)
  }
}

export async function exportLocalDatabase() {
  const db = await openDatabase()
  const documents = await new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error || new Error('Unable to export local records.'))
  })
  return {
    format: 'ascend-hms-local-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    documents,
  }
}

export async function importLocalDatabase(backup) {
  if (!backup || backup.format !== 'ascend-hms-local-backup' || backup.version !== 1 || !Array.isArray(backup.documents)) {
    throw new Error('This file is not a supported Ascend HMS local backup.')
  }
  if (!backup.documents.every((document) => typeof document?.key === 'string' && Object.prototype.hasOwnProperty.call(document, 'value'))) {
    throw new Error('The backup contains an invalid record.')
  }
  const db = await openDatabase()
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite')
    const store = transaction.objectStore(STORE)
    store.clear()
    backup.documents.forEach((document) => store.put(document))
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error || new Error('Unable to restore local records.'))
    transaction.onabort = () => reject(transaction.error || new Error('Local restore was cancelled.'))
  })
  notify('*')
}

export async function initialiseWorkspace(key, defaults) {
  return updateDocument(key, (saved) => {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaults
    const merged = { ...defaults, ...saved }
    Object.entries(defaults).forEach(([name, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value) && saved[name] && typeof saved[name] === 'object' && !Array.isArray(saved[name])) {
        merged[name] = { ...value, ...saved[name] }
      }
    })
    return merged
  }, defaults)
}

export async function appendAuditEvent({ action, resource = 'Local data', category = 'Data', outcome = 'Success' }) {
  const session = await readDocument('local.session')
  const profiles = await readDocument('local.profiles')
  const actorProfile = Array.isArray(profiles) ? profiles.find((profile) => profile.id === session?.profileId) : null
  const event = {
    id: `LOCAL-${globalThis.crypto?.randomUUID?.() || Date.now()}`,
    time: new Date().toLocaleString(),
    actor: actorProfile?.displayName || actorProfile?.name || 'Local user',
    action,
    resource,
    outcome,
    category,
  }
  await updateDocument('admin.audit', (events) => [event, ...(Array.isArray(events) ? events : [])].slice(0, 2000), [])
  return event
}
