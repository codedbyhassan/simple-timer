export function createBrowserStore({ key, seed, validate = () => true }) {
  const storageKey = `ascend-hms-preview-${key}-v1`
  const subscribers = new Set()
  const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(`${storageKey}:updates`)
  let snapshot = readInitialValue()

  function readInitialValue() {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved === null) return typeof seed === 'function' ? seed() : seed
      const value = JSON.parse(saved)
      if (!validate(value)) throw new Error('Stored preview data did not match the expected format.')
      return value
    } catch (error) {
      console.error(`Could not read the ${key} preview store.`, error)
      return typeof seed === 'function' ? seed() : seed
    }
  }

  function notify(next) {
    const serialized = JSON.stringify(next)
    if (serialized === JSON.stringify(snapshot)) return
    snapshot = next
    subscribers.forEach((listener) => listener())
  }

  function handleStorage(event) {
    if (event.key !== storageKey || event.newValue === null) return
    try {
      const next = JSON.parse(event.newValue)
      if (!validate(next)) throw new Error('Received preview data did not match the expected format.')
      notify(next)
    } catch (error) {
      console.error(`Could not apply a cross-tab update to the ${key} preview store.`, error)
    }
  }

  function handleBroadcast(event) {
    if (!validate(event.data)) {
      console.error(`Received an invalid cross-tab update for the ${key} preview store.`)
      return
    }
    notify(event.data)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage)
    channel?.addEventListener('message', handleBroadcast)
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      subscribers.add(listener)
      return () => subscribers.delete(listener)
    },
    update(updater) {
      const next = typeof updater === 'function' ? updater(snapshot) : updater
      if (!validate(next)) throw new Error(`The ${key} preview update is invalid.`)
      let serialized
      try {
        serialized = JSON.stringify(next)
        localStorage.setItem(storageKey, serialized)
      } catch (error) {
        throw new Error(`Could not persist ${key} preview data: ${error instanceof Error ? error.message : String(error)}`)
      }
      snapshot = next
      subscribers.forEach((listener) => listener())
      channel?.postMessage(next)
      return next
    },
  }
}
