const STORAGE_KEY = 'ascend-hms-generated-claims-v1'

function isSavedClaim(value) {
  return value
    && typeof value === 'object'
    && typeof value.id === 'string'
    && typeof value.sourcePatientId === 'string'
    && typeof value.sourceEncounterId === 'string'
    && typeof value.claimID === 'string'
    && typeof value.generatedAt === 'string'
    && typeof value.xml === 'string'
    && value.claim
    && typeof value.claim === 'object'
    && Array.isArray(value.claim.diagnosis)
    && Array.isArray(value.claim.investigation)
    && Array.isArray(value.claim.medicine)
    && Array.isArray(value.claim.procedure)
}

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { records: [], error: '' }
    const saved = JSON.parse(raw)
    if (saved?.version !== 1 || !Array.isArray(saved.records) || !saved.records.every(isSavedClaim)) {
      return { records: [], error: 'The saved claims archive has an unsupported or invalid format. Existing data was not changed.' }
    }
    return { records: saved.records, error: '' }
  } catch (error) {
    return {
      records: [],
      error: `Could not read the saved claims archive: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

let snapshot = readStorage()
const listeners = new Set()

function notify() {
  listeners.forEach((listener) => listener())
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      snapshot = readStorage()
      notify()
    }
  })
}

export function getGeneratedClaimsSnapshot() {
  return snapshot
}

export function subscribeToGeneratedClaims(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function findGeneratedClaim(sourcePatientId, sourceEncounterId) {
  return snapshot.records.find((record) =>
    record.sourcePatientId === sourcePatientId && record.sourceEncounterId === sourceEncounterId,
  ) || null
}

export function saveGeneratedClaim(record) {
  if (!isSavedClaim(record)) throw new Error('The claim snapshot is incomplete and could not be archived.')
  if (snapshot.error) throw new Error(snapshot.error)
  const existing = findGeneratedClaim(record.sourcePatientId, record.sourceEncounterId)
  if (existing) return { record: existing, skipped: true }

  const records = [...snapshot.records, record].sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))
  const serialized = JSON.stringify({ version: 1, records })
  try {
    localStorage.setItem(STORAGE_KEY, serialized)
  } catch (error) {
    throw new Error(`Could not save this claim to the browser archive: ${error instanceof Error ? error.message : String(error)}`)
  }
  snapshot = { records, error: '' }
  notify()
  return { record, skipped: false }
}
